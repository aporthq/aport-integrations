"""Tests for APort LangGraph Checkpoint Guardrails."""

import pytest
from unittest.mock import AsyncMock, patch

from src.guardrails import (
    APortCheckpointGuard,
    APortState,
    MockAPortClient,
    create_guarded_graph,
)


# ---------------------------------------------------------------------------
# MockAPortClient
# ---------------------------------------------------------------------------

class TestMockAPortClient:
    """Tests for the mock client."""

    @pytest.mark.asyncio
    async def test_verify_returns_success(self):
        client = MockAPortClient(api_key="test-key")
        result = await client.verify("policy.v1", "agent-1")
        assert result["verified"] is True
        assert result["passport"]["agentId"] == "agent-1"

    @pytest.mark.asyncio
    async def test_verify_uses_env_key(self, monkeypatch):
        monkeypatch.setenv("APORT_API_KEY", "env-key")
        client = MockAPortClient()
        assert client.api_key == "env-key"


# ---------------------------------------------------------------------------
# APortCheckpointGuard
# ---------------------------------------------------------------------------

class TestAPortCheckpointGuard:

    def _make_guard(self, strict=True):
        return APortCheckpointGuard(policy="test-policy", strict=strict)

    @pytest.mark.asyncio
    async def test_verify_transition_success(self):
        guard = self._make_guard()
        result = await guard.verify_transition("node_a", "node_b", {"agent_id": "agt_1"})
        assert result["verified"] is True

    @pytest.mark.asyncio
    async def test_verify_transition_strict_failure(self):
        guard = self._make_guard(strict=True)
        with patch.object(
            guard.client, "verify", new_callable=AsyncMock,
            side_effect=RuntimeError("API down"),
        ):
            with pytest.raises(RuntimeError, match="APort verification failed"):
                await guard.verify_transition("a", "b", {"agent_id": "agt_1"})

    @pytest.mark.asyncio
    async def test_verify_transition_non_strict_failure(self):
        guard = self._make_guard(strict=False)
        with patch.object(
            guard.client, "verify", new_callable=AsyncMock,
            side_effect=RuntimeError("API down"),
        ):
            result = await guard.verify_transition("a", "b", {"agent_id": "agt_1"})
            assert result["verified"] is False

    @pytest.mark.asyncio
    async def test_guard_node_success(self):
        guard = self._make_guard()

        async def my_node(state):
            return {"messages": ["executed"]}

        guarded = guard.guard_node("my_node", my_node)
        result = await guarded({"agent_id": "agt_1", "messages": []})

        assert result["aport_verified"] is True
        assert "executed" in result["messages"]

    @pytest.mark.asyncio
    async def test_guard_node_blocked_when_strict(self):
        guard = self._make_guard(strict=True)

        async def my_node(state):
            return {"messages": ["should not run"]}

        with patch.object(
            guard, "verify_transition", new_callable=AsyncMock,
            return_value={"verified": False, "message": "denied"},
        ):
            guarded = guard.guard_node("my_node", my_node)
            result = await guarded({"agent_id": "agt_1", "messages": []})

            assert result["aport_verified"] is False
            assert result["aport_error"] == "denied"

    @pytest.mark.asyncio
    async def test_create_guarded_edge_allows(self):
        guard = self._make_guard()
        edge_fn = guard.create_guarded_edge("a", "b")
        target = await edge_fn({"agent_id": "agt_1"})
        assert target == "b"

    @pytest.mark.asyncio
    async def test_create_guarded_edge_blocks(self):
        guard = self._make_guard(strict=True)
        with patch.object(
            guard, "verify_transition", new_callable=AsyncMock,
            return_value={"verified": False, "message": "no"},
        ):
            edge_fn = guard.create_guarded_edge("a", "b")
            target = await edge_fn({"agent_id": "agt_1"})
            assert target == "__end__"


# ---------------------------------------------------------------------------
# create_guarded_graph
# ---------------------------------------------------------------------------

class TestCreateGuardedGraph:

    @pytest.mark.asyncio
    async def test_creates_compiled_graph(self):
        async def start(state):
            return {"messages": ["hello"]}

        async def process(state):
            return {"messages": state["messages"] + ["world"]}

        graph = create_guarded_graph(
            policy="test.v1",
            nodes={"start": start, "process": process},
            edges=[("start", "process")],
            entry_point="start",
        )

        result = await graph.ainvoke({"agent_id": "agt_1", "messages": []})
        assert "hello" in result["messages"]
        assert "world" in result["messages"]
        assert result["aport_verified"] is True
