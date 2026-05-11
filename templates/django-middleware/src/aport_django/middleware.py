"""APort verification middleware for Django."""

from __future__ import annotations

from typing import Any, Dict, Optional

from django.http import HttpRequest, JsonResponse
from django.utils.deprecation import MiddlewareMixin

from .conf import get_aport_setting, get_client_class
from .utils import build_context, extract_agent_id


class APortMiddleware(MiddlewareMixin):
    """Protect configured Django paths with APort policy verification.

    Configure ``APORT_PROTECTED_PATHS`` as a mapping of path prefixes to policy
    names, for example ``{"/refunds/": "finance.payment.refund.v1"}``.
    """

    def __init__(self, get_response: Optional[Any] = None) -> None:
        super().__init__(get_response)
        client_class = get_client_class()
        self.client = client_class(
            api_key=get_aport_setting("API_KEY"),
            base_url=get_aport_setting("BASE_URL"),
        )
        self.default_policy = get_aport_setting("DEFAULT_POLICY")
        self.protected_paths = get_aport_setting("PROTECTED_PATHS") or {}
        self.strict = bool(get_aport_setting("STRICT"))

    def process_request(self, request: HttpRequest) -> Optional[JsonResponse]:
        """Verify the request when it matches a configured protected path."""
        policy = self._policy_for_path(request.path)
        if not policy:
            return None

        return self.verify_request(request, policy)

    def verify_request(
        self,
        request: HttpRequest,
        policy: str,
        context: Optional[Dict[str, Any]] = None,
        strict: Optional[bool] = None,
    ) -> Optional[JsonResponse]:
        """Verify a request and attach verification data to it on success."""
        agent_id = extract_agent_id(request)
        if not agent_id:
            return JsonResponse(
                {
                    "error": "Agent ID required",
                    "message": "Agent ID must be provided in headers, query, or body",
                },
                status=400,
            )

        effective_strict = self.strict if strict is None else strict

        try:
            result = self.client.verify(
                policy=policy,
                agent_id=agent_id,
                context=build_context(request, context),
            )
        except Exception:
            if effective_strict:
                return JsonResponse(
                    {
                        "error": "Verification error",
                        "message": "Internal verification error",
                    },
                    status=500,
                )
            request.aport = {"verified": False, "agent_id": agent_id, "policy": policy}
            return None

        if not result.verified:
            return JsonResponse(
                {
                    "error": "Verification failed",
                    "message": result.message or "Agent verification failed",
                    "details": result.details,
                },
                status=403,
            )

        request.aport = {
            "verified": True,
            "passport": result.passport,
            "policy": policy,
            "agent_id": agent_id,
            "result": result,
        }
        return None

    def _policy_for_path(self, path: str) -> Optional[str]:
        for prefix, policy in self.protected_paths.items():
            if path.startswith(prefix):
                return policy
        return self.default_policy if self.default_policy else None
