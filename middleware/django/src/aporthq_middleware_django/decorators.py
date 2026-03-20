"""View decorators for APort policy enforcement."""

from __future__ import annotations

import json
import logging
from functools import wraps
from typing import Any, Callable, Dict, Optional, Union

from django.http import HttpRequest, JsonResponse

from aporthq_sdk_python import APortClient, APortClientOptions, AportError, PolicyVerificationResponse

from .exceptions import AgentIdMissingError, PolicyViolationError
from .middleware import (
    _create_client,
    _decision_allow,
    _decision_meta,
    _error_json,
    _parse_body,
    extract_agent_id,
)
from .options import AgentPassportMiddlewareOptions, PolicyOptions

logger = logging.getLogger(__name__)


def _get_global_options() -> AgentPassportMiddlewareOptions:
    from django.conf import settings
    cfg = getattr(settings, "APORT_OPTIONS", None)
    if cfg is None:
        return AgentPassportMiddlewareOptions()
    if isinstance(cfg, AgentPassportMiddlewareOptions):
        return cfg
    return AgentPassportMiddlewareOptions(**{k: v for k, v in cfg.items() if k in AgentPassportMiddlewareOptions.__dataclass_fields__})


def _policy_check(request: HttpRequest, policy_options: PolicyOptions, global_opts: AgentPassportMiddlewareOptions):
    """Run a policy verification and return a JsonResponse on failure, or None on success."""
    body_json = _parse_body(request) if request.method == "POST" else {}
    agent_id = (
        policy_options.agent_id
        or extract_agent_id(request, body_json, global_opts.passport_from_body)
    )

    if not agent_id:
        return _error_json(
            401,
            "missing_agent_id",
            "Agent ID is required. Provide it as X-Agent-Passport-Id header.",
        )

    policy_request: Dict[str, Any] = {
        "agent_id": agent_id,
        "policy_id": policy_options.policy_id,
    }
    if policy_options.context:
        policy_request["context"] = policy_options.context

    client = _create_client(global_opts)
    try:
        result = client.verify(policy_request)
    except AportError as exc:
        logger.warning("Decorator policy check failed: %s", exc)
        return _error_json(403, "verification_error", str(exc), agent_id=agent_id)
    except Exception:
        logger.exception("Unexpected verification error")
        return _error_json(500, "internal_error", "Verification service unavailable")

    if result is not None and not _decision_allow(result):
        return _error_json(
            403,
            "policy_violation",
            "Policy violation",
            agent_id=agent_id,
            policy_id=policy_options.policy_id,
            decision=_decision_meta(result),
        )

    request.agent = {
        "agent_id": agent_id,
        "policy_result": _decision_meta(result) if result else None,
    }
    return None


def require_policy(policy_id: str, agent_id: Optional[str] = None, context: Optional[dict] = None):
    """Decorator that enforces a specific policy on a Django view.

    Usage::

        @require_policy("finance.payment.refund.v1", agent_id="ap_...")
        def my_view(request):
            ...

        @require_policy("finance.payment.refund.v1")
        def my_view(request):
            # agent_id read from X-Agent-Passport-Id header
            ...
    """
    policy_opts = PolicyOptions(policy_id=policy_id, agent_id=agent_id, context=context)

    def decorator(view_func: Callable):
        @wraps(view_func)
        def _wrapped_view(request: HttpRequest, *args, **kwargs):
            global_opts = _get_global_options()
            error_response = _policy_check(request, policy_opts, global_opts)
            if error_response:
                return error_response
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def require_agent(view_func: Callable):
    """Decorator that verifies agent identity (no specific policy).

    Relies on the middleware having already set request.agent, or falls back
    to extracting agent_id from headers and running a basic verification.

    Usage::

        @require_agent
        def my_view(request):
            agent_id = request.agent["agent_id"]
            ...
    """
    @wraps(view_func)
    def _wrapped_view(request: HttpRequest, *args, **kwargs):
        # If middleware already verified, allow through
        if hasattr(request, "agent") and request.agent and request.agent.get("agent_id"):
            return view_func(request, *args, **kwargs)

        global_opts = _get_global_options()
        agent_id = extract_agent_id(request)

        if not agent_id:
            if global_opts.fail_closed:
                return _error_json(
                    401,
                    "missing_agent_id",
                    "Agent ID is required. Provide it as X-Agent-Passport-Id header.",
                )
            request.agent = None
            return view_func(request, *args, **kwargs)

        request.agent = {"agent_id": agent_id, "policy_result": None}
        return view_func(request, *args, **kwargs)
    return _wrapped_view
