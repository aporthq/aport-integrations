"""Tests for APortToolGuard — LangChain tool wrapper with APort verification."""

import os
import sys
from unittest.mock import Mock, MagicMock, patch
from typing import Optional

import pytest

# Ensure local imports work
sys.path.insert(0, os.path.dirname(__file__))

from tool_guard import (
    APortToolGuard,
    guard_tool,
    ToolVerificationError,
    MockAPortClient,
    VerificationResult,
)
from langchain_core.tools import tool, Tool, StructuredTool
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Test tools
# ---------------------------------------------------------------------------

@tool
def safe_echo(text: str) -> str:
    """Echo back the input."""
    return text


@tool
def refund(amount: float, reason: str = "customer_request") -> str:
    """Issue a refund."""
    return f"Refunded ${amount:.2f} ({reason})"


class SearchInput(BaseModel):
    query: str = Field(description="Search query")
    limit: int = Field(default=10, description="Max results")


def search_fn(query: str, limit: int = 10) -> str:
    return f"Found {limit} results for '{query}'"


# StructuredTool variant (covers "all LangChain tool types" acceptance criterion)
structured_tool = StructuredTool.from_function(
    func=search_fn,
    name="search",
    description="Search the knowledge base",
    args_schema=SearchInput,
)

# Classic Tool variant
classic_tool = Tool(
    name="calculator",
    description="Perform arithmetic",
    func=lambda x: f"Result: {eval(x)}",
)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestToolGuardConstruction:
    """Test that APortToolGuard wraps all tool types correctly."""

    def test_wraps_decorated_tool(self):
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="finance.payment.refund.v1",
            agent_id="agt_test",
        )
        assert guarded.name == "refund"
        assert "refund" in guarded.description.lower()

    def test_wraps_structured_tool(self):
        guarded = APortToolGuard(
            wrapped_tool=structured_tool,
            policy="search.query.v1",
            agent_id="agt_test",
        )
        assert guarded.name == "search"
        assert guarded.args_schema == SearchInput

    def test_wraps_classic_tool(self):
        guarded = APortToolGuard(
            wrapped_tool=classic_tool,
            policy="compute.arithmetic.v1",
            agent_id="agt_test",
        )
        assert guarded.name == "calculator"

    def test_guard_tool_convenience(self):
        guarded = guard_tool(refund, "finance.payment.refund.v1", agent_id="agt_123")
        assert isinstance(guarded, APortToolGuard)
        assert guarded.policy == "finance.payment.refund.v1"
        assert guarded.agent_id == "agt_123"

    def test_fail_open_default_false(self):
        guarded = guard_tool(refund, "finance.payment.refund.v1")
        assert guarded.fail_open is False


class TestVerificationPassThrough:
    """Test that verification-pass allows tool execution."""

    def test_verified_tool_executes_sync(self):
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="finance.payment.refund.v1",
            agent_id="agt_approved",
        )
        result = guarded.invoke({"amount": 99.99})
        assert "99.99" in result

    def test_verified_tool_executes_structured(self):
        guarded = APortToolGuard(
            wrapped_tool=structured_tool,
            policy="search.query.v1",
            agent_id="agt_approved",
        )
        result = guarded.invoke({"query": "test", "limit": 5})
        assert "5" in result
        assert "test" in result

    def test_convenience_function_executes(self):
        guarded = guard_tool(refund, "finance.payment.refund.v1", agent_id="agt_conv")
        result = guarded.invoke({"amount": 42.0, "reason": "test"})
        assert "42.00" in result


class TestVerificationBlocking:
    """Test that verification-fail blocks tool execution."""

    def test_agent_id_required(self):
        """Missing agent_id should result in verification failure."""
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="finance.payment.refund.v1",
            agent_id=None,  # None — will resolve to "" → mock rejects
        )
        # Clear env var so nothing overrides
        old = os.environ.pop("APORT_AGENT_ID", None)
        try:
            with pytest.raises(ToolVerificationError):
                guarded.invoke({"amount": 100})
        finally:
            if old:
                os.environ["APORT_AGENT_ID"] = old

    def test_fail_open_allows_on_api_error(self):
        """With fail_open=True, API errors should not block execution."""
        guarded = APortToolGuard(
            wrapped_tool=safe_echo,
            policy="public.echo.v1",
            agent_id="agt_test",
            fail_open=True,
        )
        # Mock the client to raise an exception
        guarded._client = MagicMock()
        guarded._client.verify.side_effect = ConnectionError("API down")

        # Tool should still execute (fail-open)
        result = guarded.invoke({"text": "hello"})
        assert result == "hello"

    def test_fail_closed_blocks_on_api_error(self):
        """With fail_open=False (default), API errors should block."""
        guarded = APortToolGuard(
            wrapped_tool=safe_echo,
            policy="public.echo.v1",
            agent_id="agt_test",
            fail_open=False,
        )
        guarded._client = MagicMock()
        guarded._client.verify.side_effect = ConnectionError("API down")

        with pytest.raises(ToolVerificationError, match="API unreachable"):
            guarded.invoke({"text": "hello"})


class TestAgentIdResolution:
    """Test agent_id resolution from various sources."""

    def test_explicit_agent_id(self):
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="p",
            agent_id="explicit_id",
        )
        assert guarded._resolve_agent_id() == "explicit_id"

    def test_env_var_agent_id(self):
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="p",
            agent_id=None,
        )
        os.environ["APORT_AGENT_ID"] = "env_agent"
        try:
            assert guarded._resolve_agent_id() == "env_agent"
        finally:
            del os.environ["APORT_AGENT_ID"]

    def test_config_metadata_agent_id(self):
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="p",
            agent_id=None,
        )
        old = os.environ.pop("APORT_AGENT_ID", None)
        try:
            resolved = guarded._resolve_agent_id(
                config={"metadata": {"aport_agent_id": "config_agent"}}
            )
            assert resolved == "config_agent"
        finally:
            if old:
                os.environ["APORT_AGENT_ID"] = old

    def test_instance_over_env(self):
        """Instance agent_id takes priority over env var."""
        os.environ["APORT_AGENT_ID"] = "env_wrong"
        guarded = APortToolGuard(
            wrapped_tool=refund,
            policy="p",
            agent_id="instance_id",
        )
        try:
            resolved = guarded._resolve_agent_id()
            assert resolved == "instance_id", "Instance agent_id should win"
        finally:
            del os.environ["APORT_AGENT_ID"]


class TestMockClient:
    """Test the mock APort client behavior."""

    def test_verify_success(self):
        client = MockAPortClient()
        result = client.verify("p", "agt_123")
        assert result.verified is True
        assert result.passport["agentId"] == "agt_123"

    def test_verify_missing_agent_id(self):
        client = MockAPortClient()
        result = client.verify("p", "")
        assert result.verified is False
        assert "required" in result.message.lower()


class TestToolGuardError:
    """Test error types and messages."""

    def test_error_contains_tool_name(self):
        exc = ToolVerificationError(
            tool_name="refund",
            policy="finance.payment.refund.v1",
            message="Not authorized",
        )
        assert "refund" in str(exc)
        assert "finance.payment.refund.v1" in str(exc)
        assert "Not authorized" in str(exc)


class TestToolMetadataDelegation:
    """Test that metadata (name, description, schema) is delegated."""

    def test_name_delegation(self):
        guarded = APortToolGuard(wrapped_tool=refund, policy="p")
        assert guarded.name == "refund"

    def test_description_delegation(self):
        guarded = APortToolGuard(wrapped_tool=refund, policy="p")
        assert "refund" in guarded.description.lower()

    def test_args_schema_delegation(self):
        guarded = APortToolGuard(wrapped_tool=structured_tool, policy="p")
        assert guarded.args_schema == SearchInput

    def test_name_setter(self):
        """Setting name directly updates the guard's metadata."""
        guarded = APortToolGuard(wrapped_tool=refund, policy="p")
        guarded.name = "new_refund"
        assert guarded.name == "new_refund"


class TestIntegrationWithAgent:
    """Simulate an agent using multiple guarded tools."""

    def test_agent_with_guarded_and_unguarded_tools(self):
        """An agent mixing guarded and unguarded tools should work."""
        guarded_refund = guard_tool(
            refund, "finance.payment.refund.v1", agent_id="agt_agent"
        )
        # unguarded tool
        result_echo = safe_echo.invoke({"text": "hello agent"})
        assert result_echo == "hello agent"

        # guarded tool
        result_refund = guarded_refund.invoke({"amount": 10.0})
        assert "10.00" in result_refund

    def test_structured_tool_via_agent(self):
        """StructuredTool should work through APortToolGuard."""
        guarded_search = guard_tool(
            structured_tool, "search.query.v1", agent_id="agt_agent"
        )
        result = guarded_search.invoke({"query": "aport", "limit": 3})
        assert "3" in result
        assert "aport" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
