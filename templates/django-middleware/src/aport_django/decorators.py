"""View decorators for APort Django verification."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, Dict, Optional

from .middleware import APortMiddleware


def require_policy(
    policy: str,
    context: Optional[Dict[str, Any]] = None,
    strict: Optional[bool] = None,
) -> Callable:
    """Require an APort policy before a Django view is executed."""

    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapped(request: Any, *args: Any, **kwargs: Any) -> Any:
            middleware = APortMiddleware(lambda req: None)
            response = middleware.verify_request(
                request,
                policy=policy,
                context=context,
                strict=strict,
            )
            if response is not None:
                return response
            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator
