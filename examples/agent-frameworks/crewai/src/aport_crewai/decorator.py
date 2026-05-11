"""APort verification decorator for CrewAI task functions."""

from __future__ import annotations

import asyncio
import functools
import inspect
import json
import os
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Mapping, Optional, Protocol, TypeVar, Union
from urllib import error, request

F = TypeVar("F", bound=Callable[..., Any])
ContextFactory = Callable[..., Mapping[str, Any]]
AgentIdFactory = Callable[..., Optional[str]]
VerificationResult = Union[Mapping[str, Any], Any]


class APortClientProtocol(Protocol):
    """Client interface expected by the decorator."""

    def verify(
        self,
        policy: str,
        agent_id: str,
        context: Optional[Mapping[str, Any]] = None,
    ) -> Union[VerificationResult, Awaitable[VerificationResult]]:
        """Verify an agent against an APort policy pack."""


class APortVerificationError(Exception):
    """Raised when APort verification fails or cannot be completed."""

    def __init__(self, message: str, details: Optional[Mapping[str, Any]] = None):
        super().__init__(message)
        self.details = dict(details or {})


@dataclass
class APortHTTPClient:
    """Small dependency-free HTTP client for APort verification calls."""

    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: float = 10.0

    def __post_init__(self) -> None:
        self.api_key = self.api_key or os.getenv("APORT_API_KEY")
        self.base_url = (
            self.base_url or os.getenv("APORT_BASE_URL") or "https://api.aport.io"
        ).rstrip("/")

    def verify(
        self,
        policy: str,
        agent_id: str,
        context: Optional[Mapping[str, Any]] = None,
    ) -> Mapping[str, Any]:
        """Verify an agent with APort's verify API."""
        payload = json.dumps(
            {
                "policy": policy,
                "agent_id": agent_id,
                "context": dict(context or {}),
            }
        ).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "aport-crewai/0.1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        req = request.Request(
            f"{self.base_url}/api/verify",
            data=payload,
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise APortVerificationError(
                f"APort verification request failed with HTTP {exc.code}",
                {"status": exc.code, "body": body},
            ) from exc


def aport_verify(
    policy_pack: str,
    *,
    agent_id: Optional[Union[str, AgentIdFactory]] = None,
    client: Optional[APortClientProtocol] = None,
    context: Optional[Union[Mapping[str, Any], ContextFactory]] = None,
    strict: bool = True,
) -> Callable[[F], F]:
    """Verify an APort agent before running a CrewAI task function.

    Args:
        policy_pack: APort policy pack identifier, for example
            ``finance.payment.refund.v1``.
        agent_id: Static agent ID, a callable that derives the agent ID from
            task arguments, or None to read from kwargs/env.
        client: APort client with a ``verify(policy, agent_id, context)`` method.
        context: Static context mapping or callable that derives context from
            task arguments.
        strict: If true, API/client errors stop the task. If false, client
            errors are attached to context and the task continues. Explicit
            verification denial always stops the task.
    """

    if not policy_pack:
        raise ValueError("policy_pack is required")

    verifier = client or APortHTTPClient()

    def decorator(func: F) -> F:
        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                await _verify_async(
                    verifier,
                    policy_pack,
                    _resolve_agent_id(agent_id, args, kwargs),
                    _build_context(func, context, args, kwargs),
                    strict,
                )
                return await func(*args, **kwargs)

            return async_wrapper  # type: ignore[return-value]

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            _verify_sync(
                verifier,
                policy_pack,
                _resolve_agent_id(agent_id, args, kwargs),
                _build_context(func, context, args, kwargs),
                strict,
            )
            return func(*args, **kwargs)

        return sync_wrapper  # type: ignore[return-value]

    return decorator


async def _verify_async(
    client: APortClientProtocol,
    policy_pack: str,
    agent_id: str,
    context: Mapping[str, Any],
    strict: bool,
) -> None:
    try:
        result = client.verify(policy_pack, agent_id, context)
        if inspect.isawaitable(result):
            result = await result
        _raise_if_denied(result)
    except APortVerificationError:
        raise
    except Exception as exc:
        if strict:
            raise APortVerificationError("APort verification failed before task execution") from exc


def _verify_sync(
    client: APortClientProtocol,
    policy_pack: str,
    agent_id: str,
    context: Mapping[str, Any],
    strict: bool,
) -> None:
    try:
        result = client.verify(policy_pack, agent_id, context)
        if inspect.isawaitable(result):
            result = _run_awaitable(result)
        _raise_if_denied(result)
    except APortVerificationError:
        raise
    except Exception as exc:
        if strict:
            raise APortVerificationError("APort verification failed before task execution") from exc


def _run_awaitable(awaitable: Awaitable[VerificationResult]) -> VerificationResult:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(awaitable)
    raise APortVerificationError(
        "Synchronous task received an async APort client while an event loop is already running. "
        "Use an async task function or a synchronous client."
    )


def _resolve_agent_id(
    configured_agent_id: Optional[Union[str, AgentIdFactory]],
    args: tuple[Any, ...],
    kwargs: Dict[str, Any],
) -> str:
    if callable(configured_agent_id):
        value = configured_agent_id(*args, **kwargs)
    else:
        value = configured_agent_id

    value = (
        value
        or kwargs.get("aport_agent_id")
        or kwargs.get("agent_id")
        or os.getenv("APORT_AGENT_ID")
    )

    if not value:
        raise APortVerificationError(
            "APort agent_id is required. Pass agent_id, aport_agent_id, or set APORT_AGENT_ID."
        )

    return str(value)


def _build_context(
    func: Callable[..., Any],
    configured_context: Optional[Union[Mapping[str, Any], ContextFactory]],
    args: tuple[Any, ...],
    kwargs: Dict[str, Any],
) -> Mapping[str, Any]:
    if callable(configured_context):
        user_context = dict(configured_context(*args, **kwargs))
    else:
        user_context = dict(configured_context or {})

    return {
        "framework": "crewai",
        "task_name": func.__name__,
        **user_context,
    }


def _raise_if_denied(result: VerificationResult) -> None:
    allowed = _read_result_flag(result, ("allowed", "verified", "success", "ok"))
    if allowed is False:
        reason = (
            _read_result_value(result, ("reason", "message", "error"))
            or "APort verification denied"
        )
        raise APortVerificationError(str(reason), {"result": result})


def _read_result_flag(result: VerificationResult, names: tuple[str, ...]) -> Optional[bool]:
    value = _read_result_value(result, names)
    return value if isinstance(value, bool) else None


def _read_result_value(result: VerificationResult, names: tuple[str, ...]) -> Any:
    if isinstance(result, Mapping):
        for name in names:
            if name in result:
                return result[name]
        return None

    for name in names:
        if hasattr(result, name):
            return getattr(result, name)
    return None
