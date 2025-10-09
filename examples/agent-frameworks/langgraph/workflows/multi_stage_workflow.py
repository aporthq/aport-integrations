"""Advanced multi-stage workflow with multiple verification points."""

import asyncio
import logging
import os
from typing import Dict, Any, TypedDict, List
from enum import Enum

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import our APort integration
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from checkpoint_guard import APortCheckpointGuard
from exceptions import VerificationError, CheckpointError


class TaskType(Enum):
    """Task types with different verification requirements."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"


class AdvancedWorkflowState(TypedDict):
    """Advanced state schema for the workflow."""
    agent_id: str
    user_id: str
    task_type: str
    task_data: Dict[str, Any]
    permissions: List[str]
    status: str
    result: str
    audit_log: List[Dict[str, Any]]
    verification_history: List[Dict[str, Any]]


# Mock StateGraph for advanced example
class StateGraph:
    def __init__(self, schema):
        self.schema = schema
        self.nodes = {}
        self.edges = []
        self.conditional_edges = []
        self.entry_point = None
    
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
    
    def compile(self):
        return CompiledAdvancedGraph(self)


class CompiledAdvancedGraph:
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
                    
                    # Simple routing logic
                    next_node = self._get_next_node(current_node, current_state)
                    current_node = next_node
                except Exception as e:
                    logger.error(f"Node {current_node} failed: {e}")
                    current_state["status"] = "failed"
                    current_state["result"] = str(e)
                    break
            else:
                break
        
        return current_state
    
    def _get_next_node(self, current: str, state: Dict[str, Any]) -> str:
        # Simple routing based on task type and status
        if current == "validate_request":
            if state.get("status") == "validated":
                task_type = state.get("task_type")
                if task_type == "read":
                    return "execute_read"
                elif task_type == "write":
                    return "execute_write"
                elif task_type == "delete":
                    return "execute_delete"
                elif task_type == "admin":
                    return "execute_admin"
            return "end"
        elif current.startswith("execute_"):
            return "audit_action"
        elif current == "audit_action":
            return "end"
        return "end"


async def validate_request_node(state: AdvancedWorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Validate incoming request - requires basic verification."""
    logger.info(f"Validating request for task type: {state['task_type']}")
    
    # Add to audit log
    audit_entry = {
        "timestamp": asyncio.get_event_loop().time(),
        "action": "validate_request",
        "agent_id": state["agent_id"],
        "task_type": state["task_type"]
    }
    
    return {
        "status": "validated",
        "audit_log": state.get("audit_log", []) + [audit_entry]
    }


async def execute_read_node(state: AdvancedWorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute read operation - requires read policy verification."""
    logger.info("Executing read operation")
    
    # Simulate read operation
    await asyncio.sleep(0.2)
    
    audit_entry = {
        "timestamp": asyncio.get_event_loop().time(),
        "action": "execute_read",
        "agent_id": state["agent_id"],
        "data_accessed": list(state["task_data"].keys())
    }
    
    return {
        "status": "read_completed",
        "result": f"Read data: {state['task_data']}",
        "audit_log": state.get("audit_log", []) + [audit_entry]
    }


async def execute_write_node(state: AdvancedWorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute write operation - requires write policy verification."""
    logger.info("Executing write operation")
    
    # Simulate write operation
    await asyncio.sleep(0.3)
    
    audit_entry = {
        "timestamp": asyncio.get_event_loop().time(),
        "action": "execute_write",
        "agent_id": state["agent_id"],
        "data_modified": list(state["task_data"].keys())
    }
    
    return {
        "status": "write_completed",
        "result": f"Wrote data: {state['task_data']}",
        "audit_log": state.get("audit_log", []) + [audit_entry]
    }


async def execute_delete_node(state: AdvancedWorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute delete operation - requires delete policy verification."""
    logger.info("Executing delete operation")
    
    # Simulate delete operation
    await asyncio.sleep(0.4)
    
    audit_entry = {
        "timestamp": asyncio.get_event_loop().time(),
        "action": "execute_delete",
        "agent_id": state["agent_id"],
        "data_deleted": list(state["task_data"].keys())
    }
    
    return {
        "status": "delete_completed",
        "result": f"Deleted data: {list(state['task_data'].keys())}",
        "audit_log": state.get("audit_log", []) + [audit_entry]
    }


async def execute_admin_node(state: AdvancedWorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute admin operation - requires admin policy verification."""
    logger.info("Executing admin operation")
    
    # Simulate admin operation
    await asyncio.sleep(0.5)
    
    audit_entry = {
        "timestamp": asyncio.get_event_loop().time(),
        "action": "execute_admin",
        "agent_id": state["agent_id"],
        "admin_action": state["task_data"].get("admin_action", "unknown")
    }
    
    return {
        "status": "admin_completed",
        "result": f"Admin action completed: {state['task_data']}",
        "audit_log": state.get("audit_log", []) + [audit_entry]
    }


async def audit_action_node(state: AdvancedWorkflowState, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Audit the completed action - requires audit policy verification."""
    logger.info("Auditing completed action")
    
    # Create final audit entry
    final_audit = {
        "timestamp": asyncio.get_event_loop().time(),
        "action": "audit_complete",
        "agent_id": state["agent_id"],
        "final_status": state["status"],
        "total_steps": len(state.get("audit_log", []))
    }
    
    return {
        "status": "audited",
        "audit_log": state.get("audit_log", []) + [final_audit]
    }


def extract_agent_id_advanced(state: Dict[str, Any]) -> str:
    """Advanced agent ID extraction with fallbacks."""
    return state.get("agent_id") or state.get("user_id") or "unknown_agent"


def extract_context_for_task(state: Dict[str, Any]) -> Dict[str, Any]:
    """Extract context based on task type."""
    return {
        "task_type": state.get("task_type"),
        "user_id": state.get("user_id"),
        "permissions": state.get("permissions", []),
        "data_size": len(str(state.get("task_data", {}))),
        "has_audit_log": bool(state.get("audit_log"))
    }


async def create_advanced_workflow() -> CompiledAdvancedGraph:
    """Create an advanced workflow with multiple verification policies."""
    
    # Initialize APort guard
    guard = APortCheckpointGuard(
        api_key="demo_api_key",
        default_policy="workflow.advanced.v1",
        strict_mode=True,
        use_mock=True
    )
    
    # Create state graph
    workflow = StateGraph(AdvancedWorkflowState)
    
    # Add nodes with different verification policies
    
    # Validation requires basic policy
    protected_validate = guard.require_verification(
        policy="workflow.validate.v1",
        agent_id_extractor=extract_agent_id_advanced
    )(validate_request_node)
    
    # Read operations require read policy
    protected_read = guard.require_verification(
        policy="data.read.v1",
        agent_id_extractor=extract_agent_id_advanced
    )(execute_read_node)
    
    # Write operations require write policy
    protected_write = guard.require_verification(
        policy="data.write.v1",
        agent_id_extractor=extract_agent_id_advanced
    )(execute_write_node)
    
    # Delete operations require delete policy
    protected_delete = guard.require_verification(
        policy="data.delete.v1",
        agent_id_extractor=extract_agent_id_advanced
    )(execute_delete_node)
    
    # Admin operations require admin policy
    protected_admin = guard.require_verification(
        policy="system.admin.v1",
        agent_id_extractor=extract_agent_id_advanced
    )(execute_admin_node)
    
    # Audit requires audit policy
    protected_audit = guard.require_verification(
        policy="audit.write.v1",
        agent_id_extractor=extract_agent_id_advanced
    )(audit_action_node)
    
    # Add all nodes
    workflow.add_node("validate_request", protected_validate)
    workflow.add_node("execute_read", protected_read)
    workflow.add_node("execute_write", protected_write)
    workflow.add_node("execute_delete", protected_delete)
    workflow.add_node("execute_admin", protected_admin)
    workflow.add_node("audit_action", protected_audit)
    
    # Set entry point
    workflow.set_entry_point("validate_request")
    
    return workflow.compile()


async def run_advanced_workflow():
    """Run the advanced workflow with different task types."""
    logger.info("=== Advanced LangGraph + APort Integration Workflow ===")
    
    try:
        # Create workflow
        workflow = await create_advanced_workflow()
        
        # Test cases with different task types
        test_cases = [
            {
                "name": "Read Operation",
                "state": {
                    "agent_id": "agt_reader_user",
                    "user_id": "user_123",
                    "task_type": "read",
                    "task_data": {"customer_id": "cust_456", "fields": ["name", "email"]},
                    "permissions": ["read"],
                    "status": "pending",
                    "result": "",
                    "audit_log": [],
                    "verification_history": []
                }
            },
            {
                "name": "Write Operation",
                "state": {
                    "agent_id": "agt_writer_user",
                    "user_id": "user_124",
                    "task_type": "write",
                    "task_data": {"customer_id": "cust_456", "update": {"email": "new@example.com"}},
                    "permissions": ["read", "write"],
                    "status": "pending",
                    "result": "",
                    "audit_log": [],
                    "verification_history": []
                }
            },
            {
                "name": "Delete Operation (Should Fail)",
                "state": {
                    "agent_id": "agt_user_denied",  # This will fail verification
                    "user_id": "user_125",
                    "task_type": "delete",
                    "task_data": {"customer_id": "cust_456"},
                    "permissions": ["read"],
                    "status": "pending",
                    "result": "",
                    "audit_log": [],
                    "verification_history": []
                }
            },
            {
                "name": "Admin Operation",
                "state": {
                    "agent_id": "agt_admin_user",
                    "user_id": "admin_001",
                    "task_type": "admin",
                    "task_data": {"admin_action": "backup_database", "scope": "full"},
                    "permissions": ["read", "write", "admin"],
                    "status": "pending",
                    "result": "",
                    "audit_log": [],
                    "verification_history": []
                }
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            logger.info(f"\n{i}. Testing {test_case['name']}...")
            
            try:
                result = await workflow.ainvoke(
                    test_case["state"],
                    config={"configurable": {"agent_id": test_case["state"]["agent_id"]}}
                )
                
                logger.info(f"Result: {result['status']} - {result.get('result', 'No result')}")
                logger.info(f"Audit entries: {len(result.get('audit_log', []))}")
                
            except (CheckpointError, VerificationError) as e:
                logger.info(f"Expected verification failure: {e}")
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
        
        logger.info("\n4. Advanced workflow completed successfully!")
        
    except Exception as e:
        logger.error(f"Advanced workflow failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_advanced_workflow())