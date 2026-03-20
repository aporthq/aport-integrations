"""Permission classes and views for DRF + APort integration."""

from typing import Any, Dict, Optional

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.exceptions import (
    AuthenticationFailed,
    PermissionDenied,
    APIException,
)

from aporthq_sdk_python import (
    APortClient,
    APortClientOptions,
    AportError,
    PolicyVerificationResponse,
)


# ---------------------------------------------------------------------------
# APort client helper
# ---------------------------------------------------------------------------

def _get_client() -> APortClient:
    opts = APortClientOptions(
        base_url=getattr(settings, "APORT_BASE_URL", "https://api.aport.io"),
        api_key=getattr(settings, "APORT_API_KEY", ""),
        timeout_ms=getattr(settings, "APORT_TIMEOUT_MS", 5000),
    )
    return APortClient(opts)


def _extract_agent_id(request: Request) -> Optional[str]:
    """Extract agent ID from body.passport.agent_id or headers."""
    body = request.data if hasattr(request, "data") else {}
    if isinstance(body, dict):
        passport = body.get("passport") or {}
        if isinstance(passport, dict):
            aid = passport.get("agent_id")
            if aid:
                return aid
    return request.META.get("HTTP_X_AGENT_PASSPORT_ID") or request.META.get(
        "HTTP_X_AGENT_ID"
    )


# ---------------------------------------------------------------------------
# Permission classes
# ---------------------------------------------------------------------------


class APortAgentPermission(BasePermission):
    """Requires a valid APort agent identity."""

    message = "Agent authentication required."

    def has_permission(self, request: Request, view) -> bool:
        agent_id = _extract_agent_id(request)
        if not agent_id:
            raise AuthenticationFailed("Agent ID is required.")

        try:
            client = _get_client()
            client.verify_agent_sync(agent_id)
        except AportError as exc:
            raise PermissionDenied(str(exc))
        except Exception as exc:
            raise APIException(f"Verification failed: {exc}")

        # Attach to request for views to use
        request.agent_id = agent_id  # type: ignore[attr-defined]
        return True


class APortPolicyPermission(BasePermission):
    """Requires a specific APort policy to pass."""

    message = "Policy verification required."

    def __init__(self, policy_id: str):
        self.policy_id = policy_id
        super().__init__()

    def has_permission(self, request: Request, view) -> bool:
        agent_id = _extract_agent_id(request)
        if not agent_id:
            raise AuthenticationFailed("Agent ID is required.")

        try:
            client = _get_client()
            body = request.data if hasattr(request, "data") else {}
            # Allow policy_id from body or from the permission class
            pid = self.policy_id
            if isinstance(body, dict) and isinstance(body.get("passport"), dict):
                pid = body["passport"].get("policy_id") or pid

            result: PolicyVerificationResponse = client.verify_policy_sync(
                agent_id, pid, context=body
            )
            if not result.allowed:
                raise PermissionDenied(
                    f"Policy '{pid}' denied.",
                    code="policy_violation",
                )
        except (AportError, PermissionDenied) as exc:
            if isinstance(exc, PermissionDenied):
                raise
            raise PermissionDenied(str(exc))
        except Exception as exc:
            raise APIException(f"Policy check failed: {exc}")

        request.agent_id = agent_id  # type: ignore[attr-defined]
        return True


# ---------------------------------------------------------------------------
# Custom exception handler
# ---------------------------------------------------------------------------


def aport_exception_handler(exc, context):
    """DRF exception handler that formats APort errors consistently."""
    from rest_framework.views import exception_handler

    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "error": response.data.get("detail", str(exc)),
            "code": getattr(exc, "default_code", "error"),
        }
    return response


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([])
def health(request):
    """Health check — no auth required."""
    return Response({"status": "ok", "service": "drf-aport-example"})


@api_view(["GET", "POST"])
@permission_classes([APortAgentPermission])
def agent_info(request):
    """Returns info about the authenticated agent."""
    return Response(
        {
            "agent_id": request.agent_id,
            "message": "Agent verified successfully",
        }
    )


@api_view(["GET", "POST"])
@permission_classes([APortPolicyPermission("data-access-policy")])
def sensitive_data(request):
    """Requires 'data-access-policy' to be satisfied."""
    return Response(
        {
            "agent_id": request.agent_id,
            "data": {"secret": "This is protected data"},
        }
    )


@api_view(["POST"])
@permission_classes([APortPolicyPermission("write-permission-policy")])
def write_action(request):
    """Requires 'write-permission-policy'."""
    return Response(
        {
            "agent_id": request.agent_id,
            "action": "write",
            "received": request.data,
        }
    )
