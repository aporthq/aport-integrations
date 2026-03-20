"""Django middleware for Agent Passport verification using the APort SDK.

Supports all API combinations: agent_id (cloud), passport in body (local),
policy in body (pack_id IN_BODY). Delegates to aporthq_sdk_python.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Union

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.utils.deprecation import MiddlewareMixin

from aporthq_sdk_python import (
    APortClient,
    APortClientOptions,
    AportError,
    PolicyVerificationResponse,
)

from .exceptions import (
    AgentIdMissingError,
    FieldValidationError,
    PolicyViolationError,
)
from .options import AgentPassportMiddlewareOptions

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_options() -> AgentPassportMiddlewareOptions:
    """Read options from Django settings with sensible defaults."""
    cfg = getattr(settings, "APORT_OPTIONS", None)
    if cfg is None:
        return AgentPassportMiddlewareOptions()
    if isinstance(cfg, AgentPassportMiddlewareOptions):
        return cfg
    return AgentPassportMiddlewareOptions(**{k: v for k, v in cfg.items() if k in AgentPassportMiddlewareOptions.__dataclass_fields__})


def _create_client(options: AgentPassportMiddlewareOptions) -> APortClient:
    return APortClient(APortClientOptions(
        base_url=options.base_url,
        api_key=options.api_key,
        timeout_ms=options.timeout_ms,
    ))


def extract_agent_id(
    request: HttpRequest,
    body_json: Optional[Dict[str, Any]] = None,
    passport_from_body: bool = True,
) -> Optional[str]:
    """Extract agent ID from body.passport.agent_id, then headers."""
    if passport_from_body and body_json:
        passport = body_json.get("passport")
        if isinstance(passport, dict):
            aid = passport.get("agent_id")
            if aid:
                return aid
    return (
        request.META.get("HTTP_X_AGENT_PASSPORT_ID")
        or request.META.get("HTTP_X_AGENT_ID")
        or None
    )


def _parse_body(request: HttpRequest) -> Dict[str, Any]:
    """Safely parse JSON body without consuming it (Django allows re-reading)."""
    try:
        body = request.body
        if body:
            return json.loads(body)
    except (json.JSONDecodeError, ValueError):
        pass
    return {}


def _decision_allow(decision: Union[PolicyVerificationResponse, Dict[str, Any]]) -> bool:
    if hasattr(decision, "allow"):
        return bool(decision.allow)
    return bool(decision.get("allow", False))


def _decision_meta(decision: Union[PolicyVerificationResponse, Dict[str, Any]]) -> Dict[str, Any]:
    if hasattr(decision, "decision_id"):
        return {
            "decision_id": decision.decision_id,
            "allow": decision.allow,
            "reasons": getattr(decision, "reasons", []),
        }
    if isinstance(decision, dict):
        return decision
    return {"allow": False}


def _error_json(
    status: int,
    error: str,
    message: str,
    **extra: Any,
) -> JsonResponse:
    payload: Dict[str, Any] = {"error": error, "message": message}
    payload.update(extra)
    return JsonResponse(payload, status=status)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

class AgentPassportMiddleware(MiddlewareMixin):
    """Django middleware that verifies Agent Passport identity and enforces policies.

    Add to MIDDLEWARE in settings.py:
        MIDDLEWARE = [
            ...
            'aporthq_middleware_django.AgentPassportMiddleware',
        ]
        APORT_OPTIONS = {
            'policy_id': 'finance.payment.refund.v1',
            'fail_closed': True,
        }
    """

    def __init__(self, get_response=None):
        super().__init__(get_response)
        self._options = _get_options()
        self._client = _create_client(self._options)
        self._skip_paths = self._options.skip_paths

    # -- per-request --------------------------------------------------------

    def process_request(self, request: HttpRequest):
        path = request.path_info

        # Skip configured paths
        if any(path.startswith(p) for p in self._skip_paths):
            request.agent = None
            return None

        opts = self._options
        body_json = _parse_body(request) if request.method == "POST" and opts.passport_from_body else {}
        agent_id = extract_agent_id(request, body_json, opts.passport_from_body)

        if not agent_id:
            if opts.fail_closed:
                return _error_json(
                    401,
                    "missing_agent_id",
                    "Agent ID is required. Provide it as X-Agent-Passport-Id header.",
                )
            request.agent = None
            return None

        # Build policy request from options + body
        policy_request: Dict[str, Any] = {"agent_id": agent_id}

        if opts.policy_id:
            policy_request["policy_id"] = opts.policy_id
        elif opts.policy_from_body and body_json.get("policy"):
            policy_request["policy_id"] = body_json["policy"].get("pack_id") or body_json["policy"].get("policy_id")

        # Verify
        try:
            result = self._client.verify(policy_request)
        except AportError as exc:
            logger.warning("APort verification error: %s", exc)
            if opts.fail_closed:
                return _error_json(403, "verification_error", str(exc), agent_id=agent_id)
            request.agent = {"agent_id": agent_id}
            return None
        except Exception as exc:
            logger.exception("Unexpected APort error")
            if opts.fail_closed:
                return _error_json(500, "internal_error", "Verification service unavailable")
            request.agent = {"agent_id": agent_id}
            return None

        if result is not None and not _decision_allow(result):
            meta = _decision_meta(result)
            return _error_json(
                403,
                "policy_violation",
                "Policy violation",
                agent_id=agent_id,
                policy_id=opts.policy_id,
                decision=meta,
            )

        # Attach agent info to request
        request.agent = {
            "agent_id": agent_id,
            "policy_result": _decision_meta(result) if result else None,
        }

        return None
