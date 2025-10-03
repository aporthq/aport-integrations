#!/usr/bin/env python3
"""
Simple test runner for the LangGraph APort integration.
This runs basic tests without requiring pytest.
"""

import asyncio
import sys
import os
import traceback

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from checkpoint_guard import APortCheckpointGuard
from client import APortClient, MockAPortSDK
from exceptions import VerificationError, CheckpointError, ConfigurationError


class SimpleTestRunner:
    """Simple test runner without external dependencies."""
    
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
    
    def assert_equal(self, actual, expected, message=""):
        """Simple assertion for equality."""
        if actual != expected:
            raise AssertionError(f"Expected {expected}, got {actual}. {message}")
    
    def assert_true(self, condition, message=""):
        """Simple assertion for truth."""
        if not condition:
            raise AssertionError(f"Expected True, got False. {message}")
    
    def assert_false(self, condition, message=""):
        """Simple assertion for falsy."""
        if condition:
            raise AssertionError(f"Expected False, got True. {message}")
    
    def assert_raises(self, exception_class, func, *args, **kwargs):
        """Simple assertion for exceptions."""
        try:
            if asyncio.iscoroutinefunction(func):
                asyncio.run(func(*args, **kwargs))
            else:
                func(*args, **kwargs)
            raise AssertionError(f"Expected {exception_class.__name__} to be raised")
        except exception_class:
            pass  # Expected
        except Exception as e:
            raise AssertionError(f"Expected {exception_class.__name__}, got {type(e).__name__}: {e}")
    
    async def assert_raises_async(self, exception_class, coro):
        """Simple assertion for async exceptions."""
        try:
            await coro
            raise AssertionError(f"Expected {exception_class.__name__} to be raised")
        except exception_class:
            pass  # Expected
        except Exception as e:
            raise AssertionError(f"Expected {exception_class.__name__}, got {type(e).__name__}: {e}")
    
    def run_test(self, test_func):
        """Run a single test function."""
        test_name = test_func.__name__
        self.tests_run += 1
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                asyncio.run(test_func(self))
            else:
                test_func(self)
            
            print(f"[PASS] {test_name}")
            self.tests_passed += 1
            
        except Exception as e:
            print(f"[FAIL] {test_name}: {e}")
            traceback.print_exc()
            self.tests_failed += 1
    
    def summary(self):
        """Print test summary."""
        print(f"\nTest Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_failed}")
        
        if self.tests_failed == 0:
            print("All tests passed!")
            return True
        else:
            print("Some tests failed!")
            return False


# Test functions
async def test_mock_sdk_api_structure(runner):
    """Test MockAPortSDK with new API structure."""
    sdk = MockAPortSDK("test_key")
    
    # Test successful verification
    result = await sdk.verify_policy(
        agent_id="test_agent",
        policy_id="data.export.v1",
        context={"export_type": "users", "format": "csv"}
    )
    
    runner.assert_true(result["verified"])
    runner.assert_true(result["decision"]["allow"])
    runner.assert_true("decision_id" in result["decision"])
    runner.assert_true(result["passport"] is not None)


async def test_mock_sdk(runner):
    """Test MockAPortSDK with new API structure."""
    sdk = MockAPortSDK("test_key")
    
    # Test successful verification
    result = await sdk.verify_policy(
        agent_id="normal_agent",
        policy_id="payments.refund.v1",
        context={"amount": 100, "currency": "USD"}
    )
    runner.assert_true(result["verified"])
    runner.assert_true(result["decision"]["allow"])
    
    # Test failed verification
    result = await sdk.verify_policy(
        agent_id="agt_user_denied",
        policy_id="payments.refund.v1",
        context={"amount": 100, "currency": "USD"}
    )
    runner.assert_false(result["verified"])
    runner.assert_false(result["decision"]["allow"])


def test_aport_client_init(runner):
    """Test APortClient initialization."""
    # Test with API key
    client = APortClient(api_key="test_key", use_mock=True)
    runner.assert_equal(client.api_key, "test_key")
    
    # Test without API key should fail
    os.environ.pop("APORT_API_KEY", None)
    runner.assert_raises(ConfigurationError, APortClient, use_mock=True)


async def test_aport_client_verify_checkpoint(runner):
    """Test APortClient checkpoint verification."""
    client = APortClient(api_key="test_key", use_mock=True)
    
    # Test successful verification
    result = await client.verify_checkpoint(
        policy="test.policy",
        agent_id="test_agent",
        checkpoint_id="test_checkpoint",
        state={"key": "value"}
    )
    
    runner.assert_true(result["verified"])
    runner.assert_equal(result["agent_id"], "test_agent")
    
    # Test failed verification
    await runner.assert_raises_async(
        VerificationError,
        client.verify_checkpoint(
            policy="test.policy",
            agent_id="agt_user_denied",
            checkpoint_id="test_checkpoint",
            state={"key": "value"}
        )
    )


def test_checkpoint_guard_init(runner):
    """Test APortCheckpointGuard initialization."""
    guard = APortCheckpointGuard(
        api_key="test_key",
        default_policy="test.policy",
        strict_mode=True,
        use_mock=True
    )
    
    runner.assert_equal(guard.default_policy, "test.policy")
    runner.assert_true(guard.strict_mode)


def test_checkpoint_guard_extract_agent_id(runner):
    """Test agent ID extraction."""
    guard = APortCheckpointGuard(api_key="test_key", use_mock=True)
    
    # Test direct agent_id
    state = {"agent_id": "test_agent"}
    agent_id = guard._extract_agent_id(state)
    runner.assert_equal(agent_id, "test_agent")
    
    # Test agentId variant
    state = {"agentId": "test_agent2"}
    agent_id = guard._extract_agent_id(state)
    runner.assert_equal(agent_id, "test_agent2")
    
    # Test fallback to user_id
    state = {"user_id": "user_123"}
    agent_id = guard._extract_agent_id(state)
    runner.assert_equal(agent_id, "user_123")
    
    # Test nested config
    state = {"config": {"agent_id": "nested_agent"}}
    agent_id = guard._extract_agent_id(state)
    runner.assert_equal(agent_id, "nested_agent")
    
    # Test no agent ID
    state = {"other": "value"}
    agent_id = guard._extract_agent_id(state)
    runner.assert_true(agent_id is None)


async def test_checkpoint_guard_verification_decorator(runner):
    """Test the verification decorator."""
    guard = APortCheckpointGuard(
        api_key="test_key",
        strict_mode=True,
        use_mock=True
    )
    
    @guard.require_verification(policy="test.policy")
    async def test_node(state, config=None):
        return {"processed": True}
    
    # Test successful verification
    state = {"agent_id": "test_agent"}
    result = await test_node(state)
    
    runner.assert_true(result["processed"])
    runner.assert_true("_aport_verification" in state)
    runner.assert_true(state["_aport_verification"]["verified"])
    
    # Test failed verification in strict mode
    state = {"agent_id": "agt_user_denied"}
    await runner.assert_raises_async(CheckpointError, test_node(state))


async def test_checkpoint_guard_graceful_mode(runner):
    """Test graceful degradation mode."""
    guard = APortCheckpointGuard(
        api_key="test_key",
        strict_mode=False,  # Graceful mode
        use_mock=True
    )
    
    @guard.require_verification()
    async def graceful_node(state, config=None):
        if state.get("_aport_verification_error"):
            return {"result": "fallback"}
        return {"result": "normal"}
    
    # Test with denied agent in graceful mode
    state = {"agent_id": "agt_user_denied"}
    result = await graceful_node(state)
    
    runner.assert_equal(result["result"], "fallback")
    runner.assert_true("_aport_verification_error" in state)


def main():
    """Run all tests."""
    print("Running LangGraph APort Integration Tests")
    print("=" * 50)
    
    runner = SimpleTestRunner()
    
    # Run all tests
    test_functions = [
        test_mock_sdk_api_structure,
        test_mock_sdk,
        test_aport_client_init,
        test_aport_client_verify_checkpoint,
        test_checkpoint_guard_init,
        test_checkpoint_guard_extract_agent_id,
        test_checkpoint_guard_verification_decorator,
        test_checkpoint_guard_graceful_mode,
    ]
    
    for test_func in test_functions:
        runner.run_test(test_func)
    
    success = runner.summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())