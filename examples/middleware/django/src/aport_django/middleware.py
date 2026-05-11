from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.http import JsonResponse

from aport_django.client import build_client


@dataclass(frozen=True)
class PolicyRule:
    path: str
    policy: str
    methods: tuple[str, ...]
    context: dict[str, Any] | None = None

    @classmethod
    def from_mapping(cls, config: dict[str, Any]) -> PolicyRule:
        methods = config.get("methods") or ["GET", "POST", "PUT", "PATCH", "DELETE"]
        return cls(
            path=config["path"],
            policy=config["policy"],
            methods=tuple(method.upper() for method in methods),
            context=config.get("context"),
        )

    def matches(self, request: Any) -> bool:
        if request.method.upper() not in self.methods:
            return False
        return request.path == self.path or request.path.startswith(self.path.rstrip("/") + "/")


class APortVerificationMiddleware:
    def __init__(self, get_response, client: Any | None = None):
        self.get_response = get_response
        self.client = client or build_client()

    def __call__(self, request):
        rule = _matching_rule(request)
        if rule is None:
            return self.get_response(request)

        agent_id = extract_agent_id(request)
        if not agent_id:
            return aport_error(
                "aport_agent_required",
                "A protected route requires an agent identifier.",
                status=400,
            )

        verification = _verify_request(
            self.client,
            request=request,
            agent_id=agent_id,
            policy=rule.policy,
            context=rule.context,
        )

        if isinstance(verification, JsonResponse):
            return verification

        request.aport = verification
        return self.get_response(request)


def extract_agent_id(request: Any) -> str | None:
    for header in ("X-Agent-ID", "X-APort-Agent-ID"):
        value = request.headers.get(header)
        if value:
            return value

    query_value = request.GET.get("agent_id") or request.GET.get("agentId")
    if query_value:
        return query_value

    if request.method.upper() in {"POST", "PUT", "PATCH"}:
        body_value = _agent_from_body(request)
        if body_value:
            return body_value

    return None


def verify_policy_for_request(
    request: Any,
    *,
    policy: str,
    context: dict[str, Any] | None = None,
    client: Any | None = None,
) -> dict[str, Any] | JsonResponse:
    agent_id = extract_agent_id(request)
    if not agent_id:
        return aport_error(
            "aport_agent_required",
            "This view requires an agent identifier.",
            status=400,
        )

    return _verify_request(
        client or build_client(),
        request=request,
        agent_id=agent_id,
        policy=policy,
        context=context,
    )


def aport_error(code: str, message: str, *, status: int, detail: Any | None = None) -> JsonResponse:
    payload: dict[str, Any] = {"code": code, "message": message}
    if detail is not None:
        payload["detail"] = detail
    return JsonResponse(payload, status=status)


def _matching_rule(request: Any) -> PolicyRule | None:
    raw_rules = getattr(settings, "APORT_POLICIES", [])
    rules = [PolicyRule.from_mapping(rule) for rule in raw_rules]
    for rule in rules:
        if rule.matches(request):
            return rule
    return None


def _verify_request(
    client: Any,
    *,
    request: Any,
    agent_id: str,
    policy: str,
    context: dict[str, Any] | None = None,
) -> dict[str, Any] | JsonResponse:
    try:
        result = client.verify(
            agent_id=agent_id,
            policy=policy,
            context=context or {},
            request=request,
        )
    except Exception as exc:
        if _strict_mode():
            return aport_error(
                "aport_verification_error",
                "APort policy verification could not be completed.",
                status=503,
                detail=str(exc),
            )
        return {
            "verified": False,
            "agent_id": agent_id,
            "policy": policy,
            "passport": None,
            "error": str(exc),
        }

    if not result.get("verified"):
        return aport_error(
            "aport_verification_failed",
            "APort policy verification failed.",
            status=403,
            detail=result.get("reason"),
        )

    return {
        "verified": True,
        "agent_id": agent_id,
        "policy": policy,
        "passport": result.get("passport"),
        "raw": result.get("raw", result),
    }


def _agent_from_body(request: Any) -> str | None:
    content_type = request.META.get("CONTENT_TYPE", "")
    if content_type.startswith("application/json") and request.body:
        try:
            payload = json.loads(request.body.decode(request.encoding or "utf-8"))
        except (TypeError, ValueError, UnicodeDecodeError):
            return None
        return payload.get("agent_id") or payload.get("agentId")

    post_data = getattr(request, "POST", None)
    if post_data:
        return post_data.get("agent_id") or post_data.get("agentId")
    return None


def _strict_mode() -> bool:
    return bool(getattr(settings, "APORT_STRICT", True))
