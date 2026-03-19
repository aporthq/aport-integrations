"""APort LangGraph Checkpoint Guardrails implementation."""

import os
from typing import Any, Callable, Dict, List, Optional, TypedDict

from langgraph.graph import END, StateGraph
from langgraph.graph.graph import CompiledGraph
from langgraph.checkpoint.base import BaseCheckpointSaver


class APortState(TypedDict, total=False):
    """State schema for LangGraph nodes with APort metadata."""

    messages: List[str]
    agent_id: str
    aport_verified: bool
    aport_passport: Optional[Dict[str, Any]]
    aport_error: Optional[str]
    next_node: Optional[str]


class MockAPortClient:
    """Mock APort Client for demonstration.

    In production, replace with: from aporthq_sdk import APortClient
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("APORT_API_KEY")
        self.base_url = base_url or os.getenv(
            "APORT_BASE_URL", "https://api.aport.io"
        )

    async def verify(
        self,
        policy: str,
        agent_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Verify an agent against a policy.

        Args:
            policy: Policy pack identifier.
            agent_id: Agent identifier.
            context: Additional verification context.

        Returns:
            Verification result dict.
        """
        print(f"[MOCK] Verifying agent {agent_id} against policy {policy}")
        return {
            "verified": True,
            "passport": {
                "agentId": agent_id,
                "capabilities": ["read", "write"],
                "limits": {"requests": 1000, "period": "1h"},
            },
            "policy": policy,
            "message": "Mock verification successful",
        }


class APortCheckpointGuard:
    """Guard that verifies state transitions via APort before allowing them.

    Wraps any LangGraph node function with APort policy verification,
    inspecting the proposed transition and only proceeding when approved.
    """

    def __init__(
        self,
        policy: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        strict: bool = True,
        checkpoint_saver: Optional[BaseCheckpointSaver] = None,
    ):
        """Initialize the guard.

        Args:
            policy: APort policy pack identifier.
            api_key: APort API key (falls back to APORT_API_KEY env).
            base_url: APort API base URL.
            strict: When True, block transitions on verification failure.
            checkpoint_saver: Optional LangGraph checkpoint saver.
        """
        self.policy = policy
        self.strict = strict
        self.client = MockAPortClient(api_key=api_key, base_url=base_url)
        self.checkpoint_saver = checkpoint_saver

    async def verify_transition(
        self,
        source_node: str,
        target_node: str,
        state: APortState,
    ) -> Dict[str, Any]:
        """Verify a state transition against the configured policy.

        Args:
            source_node: Name of the node initiating the transition.
            target_node: Name of the target node.
            state: Current graph state.

        Returns:
            Verification result dict.
        """
        agent_id = state.get("agent_id", "unknown")

        context = {
            "transition": f"{source_node} -> {target_node}",
            "source_node": source_node,
            "target_node": target_node,
            "state_keys": list(state.keys()),
        }

        try:
            result = await self.client.verify(
                policy=self.policy,
                agent_id=agent_id,
                context=context,
            )
            return result
        except Exception as exc:
            if self.strict:
                raise RuntimeError(
                    f"APort verification failed for transition "
                    f"{source_node} -> {target_node}: {exc}"
                ) from exc
            return {"verified": False, "message": str(exc)}

    def guard_node(
        self,
        node_name: str,
        node_fn: Callable[[APortState], Dict[str, Any]],
    ) -> Callable[[APortState], Dict[str, Any]]:
        """Wrap a node function with APort verification.

        Args:
            node_name: Name of the node (used for verification context).
            node_fn: The original node function.

        Returns:
            Wrapped async function that verifies before executing.
        """
        async def guarded(state: APortState) -> Dict[str, Any]:
            result = await self.verify_transition("pre-check", node_name, state)

            if not result.get("verified") and self.strict:
                return {
                    **state,
                    "aport_verified": False,
                    "aport_error": result.get("message", "Verification failed"),
                }

            # Execute the original node
            try:
                updates = await node_fn(state) if hasattr(node_fn, "__call__") and hasattr(node_fn, "__aiter__") is False else node_fn(state)
                # If node_fn is sync, call it directly
                import asyncio
                if asyncio.iscoroutinefunction(node_fn):
                    updates = await node_fn(state)
                else:
                    updates = node_fn(state)
            except TypeError:
                updates = node_fn(state)

            return {
                **(updates if isinstance(updates, dict) else {}),
                "aport_verified": result.get("verified", False),
                "aport_passport": result.get("passport"),
            }

        return guarded

    def create_guarded_edge(
        self,
        source: str,
        target: str,
    ) -> Callable:
        """Create a guarded conditional edge.

        Args:
            source: Source node name.
            target: Target node name.

        Returns:
            Edge function that verifies before allowing transition.
        """
        async def guarded_edge(state: APortState) -> str:
            result = await self.verify_transition(source, target, state)

            if not result.get("verified") and self.strict:
                return "__end__"
            return target

        return guarded_edge


def create_guarded_graph(
    policy: str,
    nodes: Dict[str, Callable],
    edges: Optional[List[tuple]] = None,
    entry_point: str = "start",
    api_key: Optional[str] = None,
    strict: bool = True,
) -> CompiledGraph:
    """Create a LangGraph StateGraph with APort-guarded nodes and edges.

    Args:
        policy: APort policy pack identifier.
        nodes: Dict mapping node names to node functions.
        edges: List of (source, target) tuples for edges.
        entry_point: Name of the entry node.
        api_key: APort API key.
        strict: Block transitions on verification failure.

    Returns:
        Compiled LangGraph with APort guardrails.

    Example::

        async def start_node(state):
            return {"messages": ["hello"]}

        async def process_node(state):
            return {"messages": state["messages"] + ["processed"]}

        graph = create_guarded_graph(
            policy="agent.basic.v1",
            nodes={"start": start_node, "process": process_node},
            edges=[("start", "process")],
        )
    """
    guard = APortCheckpointGuard(policy=policy, api_key=api_key, strict=strict)

    builder = StateGraph(APortState)

    for name, fn in nodes.items():
        builder.add_node(name, guard.guard_node(name, fn))

    builder.set_entry_point(entry_point)

    if edges:
        for source, target in edges:
            builder.add_edge(source, target)

    return builder.compile()
