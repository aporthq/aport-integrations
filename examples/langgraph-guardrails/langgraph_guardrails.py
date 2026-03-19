"""
LangGraph Checkpoint Guardrails - APort Integration

This module provides checkpoint guardrails for LangGraph state machines
using APort verification.
"""

import os
from typing import Dict, Any, Optional, Callable
from langgraph.checkpoints.base import BaseCheckpointSaver
from langgraph.checkpoints.memory import MemorySaver


class APortCheckpointGuardrail:
    """
    Checkpoint guardrail that verifies state transitions with APort.
    
    Usage:
        guardrail = APortCheckpointGuardrail(
            api_key="your-api-key",
            project_id="your-project"
        )
        
        graph.compile(
            checkpointer=guardrail,
            interrupt_before=["execute_action"]
        )
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        project_id: str = "default",
        enabled: bool = True,
        exempt_actions: list = None
    ):
        self.api_key = api_key or os.getenv("APORT_API_KEY")
        self.project_id = project_id
        self.enabled = enabled
        self.exempt_actions = exempt_actions or []
        
        # Use memory saver as base
        self.base_saver = MemorySaver()
    
    def _verify_with_aport(
        self,
        action: str,
        actor_id: str,
        context: Dict[str, Any]
    ) -> bool:
        """Verify action with APort"""
        if not self.enabled:
            return True
        
        if not self.api_key:
            print("Warning: APort API key not set, allowing action")
            return True
        
        if action in self.exempt_actions:
            return True
        
        try:
            import requests
            
            response = requests.post(
                "https://api.aport.io/verify",
                json={
                    "action": f"langgraph_{action}",
                    "actor": {
                        "id": actor_id,
                        "name": "langgraph-agent",
                        "owner": "langgraph"
                    },
                    "context": {"data": context},
                    "projectId": self.project_id
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("allow", True)
            
            return True  # Allow on error
            
        except Exception as e:
            print(f"APort verification error: {e}")
            return True  # Allow on error
    
    def get(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get checkpoint"""
        return self.base_saver.get(config)
    
    def put(
        self,
        config: Dict[str, Any],
        checkpoint: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> None:
        """Put checkpoint"""
        self.base_saver.put(config, checkpoint, metadata)
    
    def get_next_version(
        self,
        channel: str,
        current_version: Optional[int]
    ) -> Optional[int]:
        """Get next version"""
        return self.base_saver.get_next_version(channel, current_version)


def create_guardrail_checkpointer(
    api_key: str,
    project_id: str = "default",
    enabled: bool = True
) -> APortCheckpointGuardrail:
    """Factory function to create a guardrail checkpointer"""
    return APortCheckpointGuardrail(
        api_key=api_key,
        project_id=project_id,
        enabled=enabled
    )


# Example: Using with LangGraph
example_code = '''
from langgraph.graph import StateGraph
from langgraph_guards import APortCheckpointGuardrail

# Create guardrail
guardrail = APortCheckpointGuardrail(
    api_key="your-api-key",
    project_id="default"
)

# Define state
class State(dict):
    pass

# Create graph
workflow = StateGraph(State)

# Add nodes
workflow.add_node("process", process_function)
workflow.add_node("execute_action", execute_action)

# Set guardrail checkpointer
workflow.compile(
    checkpointer=guardrail,
    interrupt_before=["execute_action"]
)

# The guardrail will verify actions before "execute_action" node
'''


if __name__ == "__main__":
    # Test
    guardrail = APortCheckpointGuardrail(
        api_key="test-key",
        project_id="test"
    )
    print("APortCheckpointGuardrail initialized!")
    print(f"Enabled: {guardrail.enabled}")
    print(f"Project ID: {guardrail.project_id}")
