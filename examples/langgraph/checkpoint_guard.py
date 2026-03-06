"""LangGraph checkpoint guardrails via APort verification."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional


class CheckpointDeniedError(RuntimeError):
    pass


@dataclass
class CheckpointDecision:
    allowed: bool
    reason: str = ""


class LangGraphCheckpointGuard:
    def __init__(
        self,
        verify_callable: Callable[[Dict[str, Any]], Dict[str, Any]],
        *,
        actor_id_getter: Callable[[Dict[str, Any], str], str],
        action: str = "state.transition",
    ) -> None:
        self._verify = verify_callable
        self._actor_id_getter = actor_id_getter
        self._action = action

    def verify_transition(self, state: Dict[str, Any], next_node: str, *, context: Optional[Dict[str, Any]] = None) -> CheckpointDecision:
        actor_id = self._actor_id_getter(state, next_node)
        payload = {
            "actor_id": actor_id,
            "action": self._action,
            "resource": f"langgraph:checkpoint:{next_node}",
            "context": context or {"state_keys": list(state.keys())},
        }
        data = self._verify(payload)
        return CheckpointDecision(bool(data.get("allowed", False)), str(data.get("reason", "")))

    def guard(self, state: Dict[str, Any], next_node: str, *, context: Optional[Dict[str, Any]] = None) -> None:
        d = self.verify_transition(state, next_node, context=context)
        if not d.allowed:
            raise CheckpointDeniedError(d.reason or "Checkpoint denied by APort policy")
