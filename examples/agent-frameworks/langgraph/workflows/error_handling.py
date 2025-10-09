"""Error handling and recovery workflows for APort integration."""

import asyncio
import logging
import os
from typing import Dict, Any, TypedDict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import our APort integration
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from checkpoint_guard import APortCheckpointGuard
from exceptions import VerificationError, CheckpointError, APortError


class ErrorHandlingState(TypedDict):
    """State schema for error handling examples."""
    agent_id: str
    operation: str
    retry_count: int
    max_retries: int
    errors: list
    status: str
    result: str
    fallback_used: bool


# Mock StateGraph for error handling
class StateGraph:
    def __init__(self, schema):
        self.schema = schema
        self.nodes = {}
        self.edges = []
        self.entry_point = None
    
    def add_node(self, name: str, func):
        self.nodes[name] = func
        return self
    
    def add_edge(self, start: str, end: str):
        self.edges.append((start, end))
        return self
    
    def set_entry_point(self, node: str):
        self.entry_point = node
        return self
    
    def compile(self):
        return CompiledErrorGraph(self)


class CompiledErrorGraph:
    def __init__(self, graph: StateGraph):
        self.graph = graph
    
    async def ainvoke(self, initial_state: Dict[str, Any], config: Dict[str, Any] = None):
        current_state = initial_state.copy()
        current_node = self.graph.entry_point
        
        while current_node and current_node != "end":
            if current_node in self.graph.nodes:
                node_func = self.graph.nodes[current_node]
                try:
                    result = await node_func(current_state, config)
                    current_state.update(result)
                    
                    # Simple routing
                    if current_state.get("status") == "completed":
                        current_node = "end"
                    elif current_state.get("status") == "retry":
                        continue  # Stay in same node
                    elif current_state.get("status") == "fallback":
                        current_node = "fallback_handler"
                    else:
                        current_node = "end"
                        
                except Exception as e:
                    logger.error(f"Node {current_node} failed: {e}")
                    current_state["status"] = "failed"
                    current_state["result"] = str(e)
                    current_state["errors"] = current_state.get("errors", []) + [str(e)]
                    break
            else:
                break
        
        return current_state


async def risky_operation_node(state: ErrorHandlingState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """A node that might fail verification - demonstrates error handling."""
    logger.info(f"Attempting risky operation: {state['operation']}")
    
    # Simulate operation
    await asyncio.sleep(0.2)
    
    # Increment retry count
    retry_count = state.get("retry_count", 0) + 1
    
    if retry_count <= state.get("max_retries", 3):
        return {
            "retry_count": retry_count,
            "status": "completed",
            "result": f"Operation '{state['operation']}' completed after {retry_count} attempts"
        }
    else:
        return {
            "retry_count": retry_count,
            "status": "fallback",
            "result": "Max retries exceeded, using fallback"
        }


async def fallback_handler_node(state: ErrorHandlingState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Fallback handler when verification fails."""
    logger.info("Using fallback handler")
    
    await asyncio.sleep(0.1)
    
    return {
        "status": "completed",
        "result": f"Fallback completed for operation: {state['operation']}",
        "fallback_used": True
    }


async def graceful_degradation_node(state: ErrorHandlingState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Node that degrades gracefully when verification fails."""
    logger.info("Attempting operation with graceful degradation")
    
    # Check if we have verification errors
    verification_error = state.get("_aport_verification_error")
    if verification_error:
        logger.warning(f"Verification failed, using limited functionality: {verification_error}")
        return {
            "status": "completed",
            "result": f"Limited operation completed (verification failed): {state['operation']}",
            "fallback_used": True
        }
    
    # Normal operation if verification passed
    return {
        "status": "completed",
        "result": f"Full operation completed: {state['operation']}"
    }


def extract_agent_id_with_fallback(state: Dict[str, Any]) -> str:
    """Extract agent ID with fallback strategies."""
    agent_id = state.get("agent_id")
    if not agent_id:
        # Try other fields
        agent_id = state.get("user_id") or state.get("session_id") or "anonymous_agent"
    return agent_id


async def create_error_handling_workflow(strict_mode: bool = True) -> CompiledErrorGraph:
    """Create a workflow with error handling strategies."""
    
    # Initialize APort guard with configurable strict mode
    guard = APortCheckpointGuard(
        api_key="demo_api_key",
        default_policy="workflow.error_handling.v1",
        strict_mode=strict_mode,
        use_mock=True
    )
    
    # Create state graph
    workflow = StateGraph(ErrorHandlingState)
    
    # Add nodes with different error handling strategies
    
    # Risky operation with strict verification
    protected_risky = guard.require_verification(
        policy="operations.risky.v1",
        agent_id_extractor=extract_agent_id_with_fallback
    )(risky_operation_node)
    
    # Graceful degradation - non-strict mode would be handled in the decorator
    protected_graceful = guard.require_verification(
        policy="operations.graceful.v1",
        agent_id_extractor=extract_agent_id_with_fallback
    )(graceful_degradation_node)
    
    workflow.add_node("risky_operation", protected_risky)
    workflow.add_node("graceful_operation", protected_graceful)
    workflow.add_node("fallback_handler", fallback_handler_node)
    
    # Set entry point based on mode
    if strict_mode:
        workflow.set_entry_point("risky_operation")
    else:
        workflow.set_entry_point("graceful_operation")
    
    return workflow.compile()


async def test_error_scenarios():
    """Test various error scenarios and recovery strategies."""
    logger.info("=== Error Handling and Recovery Examples ===")
    
    scenarios = [
        {
            "name": "Strict Mode - Authorized Agent",
            "strict_mode": True,
            "state": {
                "agent_id": "agt_authorized_user",
                "operation": "safe_data_access",
                "retry_count": 0,
                "max_retries": 3,
                "errors": [],
                "status": "pending",
                "result": "",
                "fallback_used": False
            }
        },
        {
            "name": "Strict Mode - Denied Agent",
            "strict_mode": True,
            "state": {
                "agent_id": "agt_user_denied",
                "operation": "sensitive_operation",
                "retry_count": 0,
                "max_retries": 3,
                "errors": [],
                "status": "pending",
                "result": "",
                "fallback_used": False
            }
        },
        {
            "name": "Graceful Mode - Denied Agent",
            "strict_mode": False,
            "state": {
                "agent_id": "agt_user_denied",
                "operation": "degraded_operation",
                "retry_count": 0,
                "max_retries": 3,
                "errors": [],
                "status": "pending",
                "result": "",
                "fallback_used": False
            }
        },
        {
            "name": "Missing Agent ID",
            "strict_mode": False,
            "state": {
                # No agent_id provided
                "operation": "anonymous_operation",
                "retry_count": 0,
                "max_retries": 3,
                "errors": [],
                "status": "pending",
                "result": "",
                "fallback_used": False
            }
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        logger.info(f"\n{i}. Testing: {scenario['name']}")
        
        try:
            # Create workflow with appropriate mode
            workflow = await create_error_handling_workflow(
                strict_mode=scenario["strict_mode"]
            )
            
            # Execute workflow
            result = await workflow.ainvoke(
                scenario["state"],
                config={
                    "configurable": {
                        "agent_id": scenario["state"].get("agent_id"),
                        "strict_mode": scenario["strict_mode"]
                    }
                }
            )
            
            logger.info(f"Status: {result['status']}")
            logger.info(f"Result: {result.get('result', 'No result')}")
            logger.info(f"Fallback used: {result.get('fallback_used', False)}")
            logger.info(f"Retry count: {result.get('retry_count', 0)}")
            
            if result.get("errors"):
                logger.info(f"Errors encountered: {len(result['errors'])}")
            
        except (CheckpointError, VerificationError) as e:
            logger.info(f"Expected verification failure: {e}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
    
    logger.info("\n=== Error Handling Examples Completed ===")


async def demonstrate_retry_logic():
    """Demonstrate retry logic for transient failures."""
    logger.info("\n=== Retry Logic Demonstration ===")
    
    # Simulate a scenario where the first few attempts fail
    class RetryableGuard(APortCheckpointGuard):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.attempt_count = 0
        
        async def verify_transition(self, *args, **kwargs):
            self.attempt_count += 1
            if self.attempt_count <= 2:
                logger.info(f"Simulating failure on attempt {self.attempt_count}")
                raise VerificationError("Simulated transient failure")
            
            logger.info(f"Success on attempt {self.attempt_count}")
            return await super().verify_transition(*args, **kwargs)
    
    # This would be used in a real scenario with proper retry logic
    # For demonstration, we'll just show the concept
    logger.info("In a real implementation, you would implement retry logic here")
    logger.info("Example: exponential backoff, circuit breaker patterns, etc.")


if __name__ == "__main__":
    async def main():
        await test_error_scenarios()
        await demonstrate_retry_logic()
    
    asyncio.run(main())