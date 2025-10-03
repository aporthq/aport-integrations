"""Basic state machine workflow with APort verification."""

import asyncio
import logging
import os
from typing import Dict, Any, TypedDict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock LangGraph components for demonstration
class StateGraph:
    """Mock StateGraph for demonstration purposes."""
    
    def __init__(self, schema):
        self.schema = schema
        self.nodes = {}
        self.edges = []
        self.conditional_edges = []
        self.entry_point = None
        self.finish_point = None
    
    def add_node(self, name: str, func):
        self.nodes[name] = func
        return self
    
    def add_edge(self, start: str, end: str):
        self.edges.append((start, end))
        return self
    
    def add_conditional_edges(self, start: str, condition, edge_mapping):
        self.conditional_edges.append((start, condition, edge_mapping))
        return self
    
    def set_entry_point(self, node: str):
        self.entry_point = node
        return self
    
    def set_finish_point(self, node: str):
        self.finish_point = node
        return self
    
    def compile(self):
        return CompiledGraph(self)


class CompiledGraph:
    """Mock compiled graph for demonstration."""
    
    def __init__(self, graph: StateGraph):
        self.graph = graph
    
    async def ainvoke(self, initial_state: Dict[str, Any], config: Dict[str, Any] = None):
        """Execute the graph with initial state."""
        current_state = initial_state.copy()
        
        # Simple execution: run entry point node
        if self.graph.entry_point and self.graph.entry_point in self.graph.nodes:
            node_func = self.graph.nodes[self.graph.entry_point]
            result = await node_func(current_state, config)
            current_state.update(result)
        
        return current_state


class WorkflowState(TypedDict):
    """State schema for the workflow."""
    agent_id: str
    task: str
    status: str
    result: str
    steps: list


# Import our APort integration
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from checkpoint_guard import APortCheckpointGuard
from exceptions import VerificationError, CheckpointError


async def process_task_node(state: WorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Process a task - this node requires verification."""
    logger.info(f"Processing task: {state['task']}")
    
    # Simulate task processing
    await asyncio.sleep(0.5)
    
    return {
        "status": "processing",
        "steps": state.get("steps", []) + ["task_started"],
        "result": f"Processing: {state['task']}"
    }


async def complete_task_node(state: WorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Complete a task - this node requires verification."""
    logger.info(f"Completing task: {state['task']}")
    
    # Simulate task completion
    await asyncio.sleep(0.3)
    
    return {
        "status": "completed",
        "steps": state.get("steps", []) + ["task_completed"],
        "result": f"Completed: {state['task']}"
    }


def should_complete(state: WorkflowState) -> str:
    """Conditional function to determine next step."""
    if state.get("status") == "processing":
        return "complete_task"
    return "end"


async def create_basic_workflow() -> CompiledGraph:
    """Create a basic workflow with APort verification."""
    
    # Initialize APort guard
    guard = APortCheckpointGuard(
        api_key="demo_api_key",
        default_policy="workflow.basic.v1",
        strict_mode=True,
        use_mock=True
    )
    
    # Define agent ID extractor
    def extract_agent_id(state: Dict[str, Any]) -> str:
        return state.get("agent_id", "unknown_agent")
    
    # Create state graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes with verification
    protected_process = guard.require_verification(
        policy="workflow.process.v1",
        agent_id_extractor=extract_agent_id
    )(process_task_node)
    
    protected_complete = guard.require_verification(
        policy="workflow.complete.v1",
        agent_id_extractor=extract_agent_id
    )(complete_task_node)
    
    workflow.add_node("process_task", protected_process)
    workflow.add_node("complete_task", protected_complete)
    
    # Define workflow structure
    workflow.set_entry_point("process_task")
    workflow.add_conditional_edges(
        "process_task",
        should_complete,
        {"complete_task": "complete_task", "end": "end"}
    )
    workflow.add_edge("complete_task", "end")
    
    return workflow.compile()


async def run_basic_workflow():
    """Run the basic workflow."""
    logger.info("=== Basic LangGraph + APort Integration Workflow ===")
    
    try:
        # Create workflow
        workflow = await create_basic_workflow()
        
        # Test with authorized agent
        logger.info("\n1. Testing with authorized agent...")
        authorized_state = {
            "agent_id": "agt_authorized_user",
            "task": "Analyze customer data",
            "status": "pending",
            "result": "",
            "steps": []
        }
        
        result = await workflow.ainvoke(
            authorized_state,
            config={"configurable": {"agent_id": "agt_authorized_user"}}
        )
        
        logger.info(f"Authorized result: {result}")
        
        # Test with denied agent
        logger.info("\n2. Testing with denied agent...")
        denied_state = {
            "agent_id": "agt_user_denied",  # This will fail verification
            "task": "Delete user data",
            "status": "pending",
            "result": "",
            "steps": []
        }
        
        try:
            result = await workflow.ainvoke(
                denied_state,
                config={"configurable": {"agent_id": "agt_user_denied"}}
            )
            logger.warning("Unexpected: denied agent was allowed")
        except CheckpointError as e:
            logger.info(f"Expected verification failure: {e}")
        
        logger.info("\n3. Basic workflow completed successfully!")
        
    except Exception as e:
        logger.error(f"Basic workflow failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_basic_workflow())