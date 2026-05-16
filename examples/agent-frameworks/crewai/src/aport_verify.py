"""APort CrewAI verification decorator and client."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional


@dataclass
class VerificationResult:
    verified: bool
    allow: bool
    reasons: list[str] = None
    passport: dict = None

    def __post_init__(self):
        if self.reasons is None:
            self.reasons = []
        if self.passport is None:
            self.passport = {}


class APortVerificationError(Exception):
    """Raised when APort verification fails."""

    def __init__(self, message: str, result: Optional[VerificationResult] = None):
        super().__init__(message)
        self.result = result


class APortHTTPClient:
    """Simple dependency-free APort HTTP client for verification."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 10,
    ):
        self.api_key = api_key or os.environ.get("APORT_API_KEY", "")
        self.base_url = base_url or os.environ.get("APORT_BASE_URL", "https://api.aport.io")
        self.timeout = timeout

    def verify(
        self,
        policy: str,
        agent_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """Verify an agent against a policy pack."""
        import json
        import urllib.request
        import urllib.error

        if not self.api_key:
            return VerificationResult(
                verified=True,
                allow=True,
                reasons=["No API key configured — pass-through mode"],
            )

        payload = {"policy_pack": policy, "agent_id": agent_id}
        if context:
            payload["context"] = context

        req = urllib.request.Request(
            f"{self.base_url}/verify",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read())
                return VerificationResult(
                    verified=data.get("verified", False),
                    allow=data.get("allow", False),
                    reasons=data.get("reasons", []),
                    passport=data.get("passport", {}),
                )
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8") if e.fp else ""
            return VerificationResult(
                verified=False,
                allow=False,
                reasons=[f"HTTP {e.code}: {body}"],
            )
        except Exception as e:
            return VerificationResult(
                verified=False,
                allow=False,
                reasons=[f"Error: {str(e)}"],
            )


DEFAULT_CLIENT: Optional[APortHTTPClient] = None


def get_default_client() -> APortHTTPClient:
    global DEFAULT_CLIENT
    if DEFAULT_CLIENT is None:
        DEFAULT_CLIENT = APortHTTPClient()
    return DEFAULT_CLIENT


defaport_verify = Callable[..., Any]


def aport_verify(
    policy: str,
    agent_id: Optional[str] = None,
    client: Optional[APortHTTPClient] = None,
    strict: bool = True,
    context_builder: Optional[Callable[..., Dict[str, Any]]] = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator that verifies an agent's APort passport before executing a task.

    Args:
        policy: The APort policy pack name to verify against.
        agent_id: Static agent ID string. If not provided, resolved from:
            - kwarg ``agent_id``
            - environment variable ``APORT_AGENT_ID``
            - raises APortVerificationError if none found
        client: APortHTTPClient instance. Uses default global client if None.
        strict: If True, raises APortVerificationError on denial.
                If False, allows execution to proceed after denial.
        context_builder: Optional callable that receives the same args/kwargs
                        as the decorated function and returns a dict of
                        context fields included in the verification request.

    Usage:

        @aport_verify("code.repository.merge.v1")
        def merge_code(repo, branch):
            ...

        @aport_verify("data.export.v1", agent_id="agent_123")
        def export_data(format):
            ...

        @aport_verify("finance.payment.refund.v1", context_builder=lambda amount, **kw: {"amount": amount})
        def process_refund(amount: float):
            ...
    """

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        def _resolve_agent_id(*args, **kwargs) -> str:
            if agent_id:
                return agent_id
            if "agent_id" in kwargs:
                return kwargs["agent_id"]
            if args:
                return str(args[0])
            env_id = os.environ.get("APORT_AGENT_ID")
            if env_id:
                return env_id
            raise APortVerificationError(
                "No agent_id found — set it as arg, kwarg, or env APORT_AGENT_ID"
            )

        def _build_context(*args, **kwargs) -> Dict[str, Any]:
            if context_builder:
                return context_builder(*args, **kwargs)
            return {}

        def _sync_wrapper(*args, **kwargs):
            client_ = client or get_default_client()
            resolved_agent_id = _resolve_agent_id(*args, **kwargs)
            ctx = _build_context(*args, **kwargs)

            result = client_.verify(policy, resolved_agent_id, ctx)

            if not result.allow:
                error = APortVerificationError(
                    f"APort verification denied for agent {resolved_agent_id} "
                    f"against policy {policy}: {result.reasons}",
                    result,
                )
                if strict:
                    raise error
            return fn(*args, **kwargs)

        async def _async_wrapper(*args, **kwargs):
            client_ = client or get_default_client()
            resolved_agent_id = _resolve_agent_id(*args, **kwargs)
            ctx = _build_context(*args, **kwargs)

            result = client_.verify(policy, resolved_agent_id, ctx)

            if not result.allow:
                error = APortVerificationError(
                    f"APort verification denied for agent {resolved_agent_id} "
                    f"against policy {policy}: {result.reasons}",
                    result,
                )
                if strict:
                    raise error
            return await fn(*args, **kwargs)

        import asyncio
        if asyncio.iscoroutinefunction(fn):
            return _async_wrapper
        return _sync_wrapper

    return decorator