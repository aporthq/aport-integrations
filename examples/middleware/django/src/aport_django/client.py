from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from asgiref.sync import async_to_sync
from django.conf import settings

from aport_django.exceptions import APortConfigurationError, APortVerificationError


@dataclass
class VerificationDecision:
    verified: bool
    passport: dict[str, Any] | None = None
    reason: str | None = None
    raw: Any = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "verified": self.verified,
            "passport": self.passport,
            "reason": self.reason,
            "raw": self.raw,
        }


class APortSDKClient:
    """Small synchronous adapter around the async aporthq-sdk-python client."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_ms: int | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else getattr(settings, "APORT_API_KEY", None)
        self.base_url = base_url or getattr(settings, "APORT_BASE_URL", "https://api.aport.io")
        self.timeout_ms = timeout_ms or getattr(settings, "APORT_TIMEOUT_MS", 800)
        self._client = None

    def verify(
        self,
        *,
        agent_id: str,
        policy: str,
        context: dict[str, Any] | None = None,
        request: Any = None,
    ) -> dict[str, Any]:
        client = self._get_client()
        idempotency_key = _request_header(request, "Idempotency-Key")

        try:
            decision = async_to_sync(client.verify_policy)(
                agent_id=agent_id,
                policy_id=policy,
                context=context or {},
                idempotency_key=idempotency_key,
            )
        except Exception as exc:  # pragma: no cover - exercised by injected test clients
            raise APortVerificationError(str(exc)) from exc

        return _normalize_decision(decision).as_dict()

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            from aporthq_sdk_python import APortClient, APortClientOptions
        except ImportError as exc:  # pragma: no cover - dependency declared in pyproject
            raise APortConfigurationError(
                "Install aporthq-sdk-python to use APortSDKClient."
            ) from exc

        options = APortClientOptions(
            base_url=self.base_url,
            api_key=self.api_key,
            timeout_ms=self.timeout_ms,
        )
        self._client = APortClient(options)
        return self._client


def build_client() -> Any:
    configured_client = getattr(settings, "APORT_CLIENT", None)
    if configured_client is not None:
        return configured_client

    verify_func = getattr(settings, "APORT_VERIFY_FUNC", None)
    if verify_func is not None:
        return FunctionVerifier(verify_func)

    return APortSDKClient()


class FunctionVerifier:
    def __init__(self, verify_func: Any) -> None:
        self.verify_func = verify_func

    def verify(
        self,
        *,
        agent_id: str,
        policy: str,
        context: dict[str, Any] | None = None,
        request: Any = None,
    ) -> dict[str, Any]:
        return self.verify_func(
            agent_id=agent_id,
            policy=policy,
            context=context or {},
            request=request,
        )


def _normalize_decision(decision: Any) -> VerificationDecision:
    if isinstance(decision, dict):
        return VerificationDecision(
            verified=bool(
                decision.get("verified")
                or decision.get("allow")
                or decision.get("allowed")
            ),
            passport=decision.get("passport") or decision.get("agent_passport"),
            reason=decision.get("reason") or decision.get("message"),
            raw=decision,
        )

    verified = bool(
        getattr(decision, "verified", False)
        or getattr(decision, "allow", False)
        or getattr(decision, "allowed", False)
    )
    passport = getattr(decision, "passport", None) or getattr(decision, "agent_passport", None)
    reason = getattr(decision, "reason", None)
    if reason is None:
        reasons = getattr(decision, "reasons", None)
        reason = reasons[0] if reasons else None

    return VerificationDecision(
        verified=verified,
        passport=passport,
        reason=reason,
        raw=decision,
    )


def _request_header(request: Any, header: str) -> str | None:
    if request is None:
        return None
    if hasattr(request, "headers"):
        return request.headers.get(header)
    meta_key = "HTTP_" + header.upper().replace("-", "_")
    return getattr(request, "META", {}).get(meta_key)
