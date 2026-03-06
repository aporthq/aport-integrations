"""APort verification decorator for CrewAI tasks.

This module is framework-light so it can be imported in examples/tests
without requiring live APort or CrewAI services.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import wraps
import inspect
from typing import Any, Callable, Dict, Optional


class APortVerificationError(RuntimeError):
    pass


@dataclass
class VerificationResult:
    allowed: bool
    reason: str = ""
    meta: Optional[Dict[str, Any]] = None


class APortVerifier:
    """Small adapter around aporthq-sdk-python style verifier."""

    def __init__(self, verify_callable: Callable[..., Dict[str, Any]]):
        self._verify_callable = verify_callable

    def verify(self, *, actor_id: str, action: str, resource: str, context: Optional[Dict[str, Any]] = None) -> VerificationResult:
        payload = {
            "actor_id": actor_id,
            "action": action,
            "resource": resource,
            "context": context or {},
        }
        data = self._verify_callable(payload)
        return VerificationResult(
            allowed=bool(data.get("allowed", False)),
            reason=str(data.get("reason", "")),
            meta=data,
        )


def aport_verify(
    verifier: APortVerifier,
    *,
    actor_id_getter: Callable[..., str],
    action: str,
    resource: str,
    context_getter: Optional[Callable[..., Dict[str, Any]]] = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator for CrewAI tasks.

    Works with:
    - sync functions
    - async functions
    - plain callables used by CrewAI task wrappers
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        is_async = inspect.iscoroutinefunction(func)

        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            actor_id = actor_id_getter(*args, **kwargs)
            context = context_getter(*args, **kwargs) if context_getter else {}
            result = verifier.verify(actor_id=actor_id, action=action, resource=resource, context=context)
            if not result.allowed:
                raise APortVerificationError(result.reason or "APort verification failed")
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            actor_id = actor_id_getter(*args, **kwargs)
            context = context_getter(*args, **kwargs) if context_getter else {}
            result = verifier.verify(actor_id=actor_id, action=action, resource=resource, context=context)
            if not result.allowed:
                raise APortVerificationError(result.reason or "APort verification failed")
            return func(*args, **kwargs)

        return async_wrapper if is_async else sync_wrapper

    return decorator
