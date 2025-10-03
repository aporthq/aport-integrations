"""Tests for APort checkpoint guard functionality."""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, AsyncMock, patch

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from checkpoint_guard import APortCheckpointGuard, APortCheckpointSaver
from client import APortClient, MockVerificationResult
from exceptions import VerificationError, CheckpointError, ConfigurationError


class TestAPortClient:
    """Test cases for APortClient."""
    
    def test_client_initialization(self):
        """Test client initialization with various configurations."""
        # Test with API key
        client = APortClient(api_key="test_key", use_mock=True)
        assert client.api_key == "test_key"
        assert client.use_mock is True
    
    def test_client_initialization_without_api_key(self):
        """Test client initialization fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError):
                APortClient(use_mock=True)
    
    @pytest.mark.asyncio
    async def test_verify_checkpoint_success(self):
        """Test successful checkpoint verification."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        result = await client.verify_checkpoint(
            policy="test.policy.v1",
            agent_id="agt_test_user",
            checkpoint_id="checkpoint_1",
            state={"key": "value"},
            context={"test": True}
        )
        
        assert result["verified"] is True
        assert result["agent_id"] == "agt_test_user"
        assert result["policy"] == "test.policy.v1"
        assert result["checkpoint_id"] == "checkpoint_1"
    
    @pytest.mark.asyncio
    async def test_verify_checkpoint_failure(self):
        """Test checkpoint verification failure."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        with pytest.raises(VerificationError):
            await client.verify_checkpoint(
                policy="test.policy.v1",
                agent_id="agt_user_denied",  # This triggers mock failure
                checkpoint_id="checkpoint_1",
                state={"key": "value"}
            )
    
    @pytest.mark.asyncio
    async def test_verify_state_transition(self):
        """Test state transition verification."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        result = await client.verify_state_transition(
            policy="transition.policy.v1",
            agent_id="agt_test_user",
            from_state="start",
            to_state="processing",
            state_data={"data": "test"}
        )
        
        assert result["verified"] is True
        assert "transition" in result["checkpoint_id"]


class TestAPortCheckpointGuard:
    """Test cases for APortCheckpointGuard."""
    
    def test_guard_initialization(self):
        """Test guard initialization."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="test.policy.v1",
            strict_mode=True,
            use_mock=True
        )
        
        assert guard.default_policy == "test.policy.v1"
        assert guard.strict_mode is True
        assert isinstance(guard.client, APortClient)
    
    def test_add_verification_rule(self):
        """Test adding verification rules."""
        guard = APortCheckpointGuard(api_key="test_key", use_mock=True)
        
        guard.add_verification_rule(
            state_name="test_state",
            policy="test.state.policy.v1",
            required_capabilities=["read", "write"]
        )
        
        assert "test_state" in guard.verification_rules
        rule = guard.verification_rules["test_state"]
        assert rule["policy"] == "test.state.policy.v1"
        assert rule["required_capabilities"] == ["read", "write"]
    
    def test_extract_agent_id_default(self):
        """Test default agent ID extraction."""
        guard = APortCheckpointGuard(api_key="test_key", use_mock=True)
        
        # Test with agent_id
        state = {"agent_id": "agt_123"}
        agent_id = guard._extract_agent_id(state)
        assert agent_id == "agt_123"
        
        # Test with agentId
        state = {"agentId": "agt_456"}
        agent_id = guard._extract_agent_id(state)
        assert agent_id == "agt_456"
        
        # Test with user_id fallback
        state = {"user_id": "user_789"}
        agent_id = guard._extract_agent_id(state)
        assert agent_id == "user_789"
        
        # Test with nested config
        state = {"config": {"agent_id": "agt_nested"}}
        agent_id = guard._extract_agent_id(state)
        assert agent_id == "agt_nested"
        
        # Test with no agent ID
        state = {"other_field": "value"}
        agent_id = guard._extract_agent_id(state)
        assert agent_id is None
    
    def test_extract_agent_id_custom(self):
        """Test custom agent ID extraction."""
        guard = APortCheckpointGuard(api_key="test_key", use_mock=True)
        
        def custom_extractor(state):
            return state.get("custom_agent_field")
        
        state = {"custom_agent_field": "custom_agent_123"}
        agent_id = guard._extract_agent_id(state, custom_extractor)
        assert agent_id == "custom_agent_123"
    
    @pytest.mark.asyncio
    async def test_require_verification_decorator_success(self):
        """Test the require_verification decorator with successful verification."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="test.policy.v1",
            strict_mode=True,
            use_mock=True
        )
        
        @guard.require_verification(policy="node.policy.v1")
        async def test_node(state, config=None):
            return {"processed": True}
        
        state = {"agent_id": "agt_test_user", "data": "test"}
        result = await test_node(state)
        
        assert result["processed"] is True
        assert "_aport_verification" in state
        assert state["_aport_verification"]["verified"] is True
    
    @pytest.mark.asyncio
    async def test_require_verification_decorator_failure_strict(self):
        """Test the require_verification decorator with failed verification in strict mode."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="test.policy.v1",
            strict_mode=True,
            use_mock=True
        )
        
        @guard.require_verification(policy="node.policy.v1")
        async def test_node(state, config=None):
            return {"processed": True}
        
        state = {"agent_id": "agt_user_denied", "data": "test"}
        
        with pytest.raises(CheckpointError):
            await test_node(state)
    
    @pytest.mark.asyncio
    async def test_require_verification_decorator_failure_non_strict(self):
        """Test the require_verification decorator with failed verification in non-strict mode."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="test.policy.v1",
            strict_mode=False,
            use_mock=True
        )
        
        @guard.require_verification(policy="node.policy.v1")
        async def test_node(state, config=None):
            return {"processed": True}
        
        state = {"agent_id": "agt_user_denied", "data": "test"}
        result = await test_node(state)
        
        assert result["processed"] is True
        assert "_aport_verification_error" in state
    
    @pytest.mark.asyncio
    async def test_require_verification_no_agent_id_strict(self):
        """Test verification with no agent ID in strict mode."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            strict_mode=True,
            use_mock=True
        )
        
        @guard.require_verification()
        async def test_node(state, config=None):
            return {"processed": True}
        
        state = {"data": "test"}  # No agent_id
        
        with pytest.raises(CheckpointError):
            await test_node(state)
    
    @pytest.mark.asyncio
    async def test_require_verification_no_agent_id_non_strict(self):
        """Test verification with no agent ID in non-strict mode."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            strict_mode=False,
            use_mock=True
        )
        
        @guard.require_verification()
        async def test_node(state, config=None):
            return {"processed": True}
        
        state = {"data": "test"}  # No agent_id
        result = await test_node(state)
        
        assert result["processed"] is True
    
    @pytest.mark.asyncio
    async def test_verify_transition(self):
        """Test state transition verification."""
        guard = APortCheckpointGuard(api_key="test_key", use_mock=True)
        
        result = await guard.verify_transition(
            agent_id="agt_test_user",
            from_state="start",
            to_state="processing",
            state_data={"key": "value"},
            policy="transition.policy.v1"
        )
        
        assert result["verified"] is True
        assert result["agent_id"] == "agt_test_user"


class TestMockAPortSDK:
    """Test cases for the mock APort SDK."""
    
    @pytest.mark.asyncio
    async def test_mock_verification_success(self):
        """Test mock verification returns success for normal agents."""
        from client import MockAPortSDK
        
        mock_client = MockAPortSDK("test_key")
        result = await mock_client.verify("test.policy.v1", "agt_normal_user")
        
        assert result.verified is True
        assert result.agent_id == "agt_normal_user"
        assert result.policy == "test.policy.v1"
        assert result.passport is not None
    
    @pytest.mark.asyncio
    async def test_mock_verification_failure(self):
        """Test mock verification returns failure for denied agents."""
        from client import MockAPortSDK
        
        mock_client = MockAPortSDK("test_key")
        result = await mock_client.verify("test.policy.v1", "agt_user_denied")
        
        assert result.verified is False
        assert result.agent_id == "agt_user_denied"
        assert result.passport is None


class TestIntegrationScenarios:
    """Integration test scenarios."""
    
    @pytest.mark.asyncio
    async def test_full_workflow_simulation(self):
        """Test a complete workflow simulation."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="workflow.test.v1",
            use_mock=True
        )
        
        # Create mock nodes
        @guard.require_verification(policy="node1.policy.v1")
        async def node1(state, config=None):
            return {"step1_completed": True}
        
        @guard.require_verification(policy="node2.policy.v1")
        async def node2(state, config=None):
            return {"step2_completed": True}
        
        # Simulate workflow execution
        initial_state = {"agent_id": "agt_test_user", "workflow_id": "wf_123"}
        
        # Execute node1
        state = initial_state.copy()
        result1 = await node1(state)
        state.update(result1)
        
        # Execute node2
        result2 = await node2(state)
        state.update(result2)
        
        # Verify final state
        assert state["step1_completed"] is True
        assert state["step2_completed"] is True
        assert "_aport_verification" in state
        assert state["_aport_verification"]["verified"] is True
    
    @pytest.mark.asyncio
    async def test_error_recovery_scenario(self):
        """Test error recovery in workflows."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            strict_mode=False,  # Allow graceful degradation
            use_mock=True
        )
        
        @guard.require_verification()
        async def risky_node(state, config=None):
            if state.get("_aport_verification_error"):
                # Fallback behavior
                return {"result": "fallback_result", "fallback_used": True}
            return {"result": "normal_result", "fallback_used": False}
        
        # Test with denied agent (should use fallback)
        state = {"agent_id": "agt_user_denied"}
        result = await risky_node(state)
        
        assert result["fallback_used"] is True
        assert result["result"] == "fallback_result"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])