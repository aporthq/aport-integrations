"""Tests for APort client functionality."""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, AsyncMock, patch

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from client import APortClient, MockAPortSDK, MockVerificationResult
from exceptions import VerificationError, APortError, ConfigurationError


class TestMockVerificationResult:
    """Test cases for MockVerificationResult."""
    
    def test_verification_result_success(self):
        """Test successful verification result."""
        result = MockVerificationResult(verified=True, agent_id="agt_123", policy="test.policy.v1")
        
        assert result.verified is True
        assert result.agent_id == "agt_123"
        assert result.policy == "test.policy.v1"
        assert result.passport is not None
        assert result.passport["agent_id"] == "agt_123"
        assert "capabilities" in result.passport
        assert "limits" in result.passport
    
    def test_verification_result_failure(self):
        """Test failed verification result."""
        result = MockVerificationResult(verified=False, agent_id="agt_456", policy="test.policy.v1")
        
        assert result.verified is False
        assert result.agent_id == "agt_456"
        assert result.passport is None
        assert "failed" in result.message


class TestMockAPortSDK:
    """Test cases for MockAPortSDK."""
    
    def test_sdk_initialization(self):
        """Test SDK initialization."""
        sdk = MockAPortSDK(api_key="test_key", base_url="https://test.api.com")
        
        assert sdk.api_key == "test_key"
        assert sdk.base_url == "https://test.api.com"
    
    @pytest.mark.asyncio
    async def test_verify_success(self):
        """Test successful verification."""
        sdk = MockAPortSDK("test_key")
        
        result = await sdk.verify("test.policy.v1", "agt_normal_user")
        
        assert result.verified is True
        assert result.agent_id == "agt_normal_user"
        assert result.policy == "test.policy.v1"
    
    @pytest.mark.asyncio
    async def test_verify_failure(self):
        """Test failed verification for denied agents."""
        sdk = MockAPortSDK("test_key")
        
        result = await sdk.verify("test.policy.v1", "agt_user_denied")
        
        assert result.verified is False
        assert result.agent_id == "agt_user_denied"
    
    @pytest.mark.asyncio
    async def test_verify_with_context(self):
        """Test verification with context."""
        sdk = MockAPortSDK("test_key")
        
        context = {"operation": "test", "user_id": "user_123"}
        result = await sdk.verify("test.policy.v1", "agt_test", context)
        
        assert result.verified is True
        assert result.details["mock"] is True


class TestAPortClient:
    """Test cases for APortClient."""
    
    def test_client_initialization_with_env_vars(self):
        """Test client initialization with environment variables."""
        with patch.dict(os.environ, {"APORT_API_KEY": "env_key", "APORT_BASE_URL": "https://env.api.com"}):
            client = APortClient(use_mock=True)
            
            assert client.api_key == "env_key"
            assert client.base_url == "https://env.api.com"
    
    def test_client_initialization_with_params(self):
        """Test client initialization with parameters."""
        client = APortClient(
            api_key="param_key",
            base_url="https://param.api.com",
            timeout=10000,
            use_mock=True
        )
        
        assert client.api_key == "param_key"
        assert client.base_url == "https://param.api.com"
        assert client.timeout == 10000
    
    def test_client_initialization_no_api_key(self):
        """Test client initialization fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError, match="APort API key is required"):
                APortClient(use_mock=True)
    
    @pytest.mark.asyncio
    async def test_verify_checkpoint_success(self):
        """Test successful checkpoint verification."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        result = await client.verify_checkpoint(
            policy="test.policy.v1",
            agent_id="agt_test_user",
            checkpoint_id="checkpoint_123",
            state={"key": "value"},
            context={"test_context": "value"}
        )
        
        assert result["verified"] is True
        assert result["agent_id"] == "agt_test_user"
        assert result["policy"] == "test.policy.v1"
        assert result["checkpoint_id"] == "checkpoint_123"
        assert result["passport"] is not None
    
    @pytest.mark.asyncio
    async def test_verify_checkpoint_failure(self):
        """Test failed checkpoint verification."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        with pytest.raises(VerificationError) as exc_info:
            await client.verify_checkpoint(
                policy="test.policy.v1",
                agent_id="agt_user_denied",
                checkpoint_id="checkpoint_123",
                state={"key": "value"}
            )
        
        assert "agt_user_denied" in str(exc_info.value)
        assert "checkpoint_123" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_verify_state_transition(self):
        """Test state transition verification."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        result = await client.verify_state_transition(
            policy="transition.policy.v1",
            agent_id="agt_test_user",
            from_state="initial",
            to_state="processing",
            state_data={"data": "test"},
            context={"extra": "context"}
        )
        
        assert result["verified"] is True
        assert result["agent_id"] == "agt_test_user"
        assert "transition_initial_to_processing" in result["checkpoint_id"]
    
    @pytest.mark.asyncio
    async def test_verify_checkpoint_with_mock_client(self):
        """Test verification uses mock client correctly."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        # Verify that mock client is being used
        assert isinstance(client.client, MockAPortSDK)
        
        # Test that verification works
        result = await client.verify_checkpoint(
            policy="test.policy.v1",
            agent_id="agt_test",
            checkpoint_id="test_checkpoint",
            state={}
        )
        
        assert result["verified"] is True


class TestClientErrorHandling:
    """Test error handling in client."""
    
    @pytest.mark.asyncio
    async def test_generic_error_handling(self):
        """Test generic error handling in verification."""
        client = APortClient(api_key="test_key", use_mock=True)
        
        # Mock the client to raise a generic exception
        with patch.object(client.client, 'verify', side_effect=Exception("Generic error")):
            with pytest.raises(APortError, match="Checkpoint verification failed"):
                await client.verify_checkpoint(
                    policy="test.policy.v1",
                    agent_id="agt_test",
                    checkpoint_id="test_checkpoint",
                    state={}
                )


class TestClientLogging:
    """Test logging functionality."""
    
    @pytest.mark.asyncio
    async def test_successful_verification_logging(self, caplog):
        """Test that successful verifications are logged."""
        import logging
        
        with caplog.at_level(logging.INFO):
            client = APortClient(api_key="test_key", use_mock=True)
            
            await client.verify_checkpoint(
                policy="test.policy.v1",
                agent_id="agt_test",
                checkpoint_id="test_checkpoint",
                state={}
            )
            
            # Check that verification logs were created
            assert any("Verifying checkpoint" in record.message for record in caplog.records)
            assert any("verification successful" in record.message for record in caplog.records)
    
    @pytest.mark.asyncio
    async def test_failed_verification_logging(self, caplog):
        """Test that failed verifications are logged."""
        import logging
        
        with caplog.at_level(logging.ERROR):
            client = APortClient(api_key="test_key", use_mock=True)
            
            try:
                await client.verify_checkpoint(
                    policy="test.policy.v1",
                    agent_id="agt_user_denied",
                    checkpoint_id="test_checkpoint",
                    state={}
                )
            except VerificationError:
                pass  # Expected
            
            # Check that error logs were created
            assert any("Checkpoint verification error" in record.message for record in caplog.records)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])