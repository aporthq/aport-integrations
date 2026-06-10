from __future__ import annotations

from dataclasses import dataclass
from functools import wraps
import inspect
import os
from typing import Any, Callable, Mapping

import requests


class APortVerificationError(RuntimeError):
    """Raised when APort denies or cannot verify a CrewAI task."""


@dataclass(frozen=True)
class APortDecision:
    allow: bool
    reasons: tuple[str, ...] = ()
    decision_id: str | None = None

    @classmethod
    def from_response(cls, response: Mapping[str, Any]) -> "APortDecision":
        decision = response.get("data", {}).get("decision") or response.get("decision") or response
        reasons = tuple(
            reason.get("message") or reason.get("code") or str(reason)
            for reason in decision.get("reasons", [])
        )
        return cls(
            allow=bool(decision.get("allow")),
            reasons=reasons,
            decision_id=decision.get("decision_id"),
        )


class APortClient:
    def __init__(
        self,
        api_key: str | None = None,
        api_url: str | None = None,
        timeout: int = 10,
    ) -> None:
        self.api_key = api_key if api_key is not None else os.getenv("APORT_API_KEY", "")
        self.api_url = api_url or os.getenv("APORT_API_URL", "https://aport.io/api/verify")
        self.timeout = timeout

    def verify(self, policy_pack: str, context: Mapping[str, Any]) -> APortDecision:
        response = requests.post(
            self.api_url,
            headers={
                "authorization": f"Bearer {self.api_key}",
                "content-type": "application/json",
            },
            json={"policy_pack": policy_pack, "context": dict(context)},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return APortDecision.from_response(response.json())


def _serializable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Mapping):
        return {str(key): _serializable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_serializable(item) for item in value]
    return repr(value)


def build_task_context(
    task_type: str,
    func: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: Mapping[str, Any],
    extra_context: Mapping[str, Any] | Callable[..., Mapping[str, Any]] | None,
) -> dict[str, Any]:
    context: dict[str, Any] = {
        "task_type": task_type,
        "callable": f"{func.__module__}.{func.__qualname__}",
        "args": _serializable(args),
        "kwargs": _serializable(kwargs),
    }

    if extra_context:
        additional = extra_context(*args, **kwargs) if callable(extra_context) else extra_context
        context.update(_serializable(additional))

    return context


def _raise_denied(decision: APortDecision) -> None:
    reason_text = "; ".join(decision.reasons) if decision.reasons else "APort denied task execution"
    if decision.decision_id:
        reason_text = f"{reason_text} (decision {decision.decision_id})"
    raise APortVerificationError(reason_text)


def aport_verify(
    policy_pack: str,
    *,
    task_type: str = "generic",
    client: Any | None = None,
    context: Mapping[str, Any] | Callable[..., Mapping[str, Any]] | None = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Verify a CrewAI task before execution.

    The decorator works with normal functions, bound methods, and async task
    callables, so it can protect CrewAI tasks implemented with different task
    patterns.
    """

    verifier = client or APortClient()

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        if inspect.iscoroutinefunction(func):

            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                task_context = build_task_context(task_type, func, args, kwargs, context)
                decision = verifier.verify(policy_pack, task_context)
                if not decision.allow:
                    _raise_denied(decision)
                return await func(*args, **kwargs)

            return async_wrapper

        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            task_context = build_task_context(task_type, func, args, kwargs, context)
            decision = verifier.verify(policy_pack, task_context)
            if not decision.allow:
                _raise_denied(decision)
            return func(*args, **kwargs)

        return wrapper

    return decorator
