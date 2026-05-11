from __future__ import annotations

from functools import wraps
from typing import Any

from django.conf import settings
from django.http import JsonResponse

from aport_django.client import build_client
from aport_django.middleware import verify_policy_for_request


def aport_required(
    policy: str,
    *,
    context: dict[str, Any] | None = None,
    client: Any | None = None,
):
    """Protect a function-based view with an APort policy check."""

    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            verifier = client or getattr(settings, "APORT_DECORATOR_CLIENT", None) or build_client()
            verification = verify_policy_for_request(
                request,
                policy=policy,
                context=context,
                client=verifier,
            )
            if isinstance(verification, JsonResponse):
                return verification
            request.aport = verification
            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator
