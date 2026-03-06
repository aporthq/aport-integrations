"""APort Tool Guard for LangChain tools.

Wraps any callable tool and verifies policy before execution.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional


class APortToolGuardError(RuntimeError):
    pass


@dataclass
class VerifyResult:
    allowed: bool
    reason: str = ""


class APortToolGuard:
    def __init__(
        self,
        verify_callable: Callable[[Dict[str, Any]], Dict[str, Any]],
        *,
        actor_id_getter: Callable[..., str],
        resource_getter: Callable[..., str],
        action: str = "tool.execute",
    ) -> None:
        self._verify = verify_callable
        self._actor_id_getter = actor_id_getter
        self._resource_getter = resource_getter
        self._action = action

    def _check(self, *args: Any, **kwargs: Any) -> VerifyResult:
        actor_id = self._actor_id_getter(*args, **kwargs)
        resource = self._resource_getter(*args, **kwargs)
        payload = {
            "actor_id": actor_id,
            "action": self._action,
            "resource": resource,
            "context": {"kwargs": {k: str(v) for k, v in kwargs.items()}},
        }
        data = self._verify(payload)
        return VerifyResult(bool(data.get("allowed", False)), str(data.get("reason", "")))

    def wrap(self, tool: Callable[..., Any]) -> Callable[..., Any]:
        def guarded(*args: Any, **kwargs: Any) -> Any:
            result = self._check(*args, **kwargs)
            if not result.allowed:
                raise APortToolGuardError(result.reason or "APort verification failed")
            return tool(*args, **kwargs)

        guarded.__name__ = getattr(tool, "__name__", "guarded_tool")
        guarded.__doc__ = getattr(tool, "__doc__", "")
        return guarded
