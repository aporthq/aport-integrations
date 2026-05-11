"""Shared request helpers for APort Django verification."""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from django.http import HttpRequest


def extract_agent_id(request: HttpRequest) -> Optional[str]:
    """Extract an agent id from headers, query string, or JSON body."""
    agent_id = request.headers.get("X-Agent-ID") or request.headers.get(
        "X-APort-Agent-ID"
    )
    if agent_id:
        return agent_id

    agent_id = request.GET.get("agent_id")
    if agent_id:
        return agent_id

    if request.content_type == "application/json" and request.body:
        try:
            data = json.loads(request.body.decode(request.encoding or "utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
        return data.get("agent_id") or data.get("agentId")

    return None


def build_context(
    request: HttpRequest,
    extra_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build the context payload sent to APort verification."""
    return {
        "method": request.method,
        "path": request.path,
        "user_agent": request.headers.get("User-Agent"),
        "ip": _get_client_ip(request),
        **(extra_context or {}),
    }


def _get_client_ip(request: HttpRequest) -> Optional[str]:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.META.get("REMOTE_ADDR")
