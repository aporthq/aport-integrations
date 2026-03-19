"""
CrewAI Task Verification Decorator using APort

This module provides a decorator for verifying CrewAI tasks with APort.
"""

import os
import functools
from typing import Callable, Any, Optional
import requests


class APortVerificationError(Exception):
    """Exception raised when APort verification fails"""
    pass


class AportVerify:
    """APort verification client"""
    
    def __init__(self, api_key: Optional[str] = None, project_id: str = "default"):
        self.api_key = api_key or os.getenv("APORT_API_KEY")
        self.project_id = project_id
        self.enabled = True
    
    def verify(self, action: str, actor_id: str, actor_name: str, context: dict) -> bool:
        """Verify an action with APort"""
        if not self.enabled:
            return True
        
        if not self.api_key:
            print("Warning: APort API key not set, allowing action")
            return True
        
        try:
            response = requests.post(
                "https://api.aport.io/verify",
                json={
                    "action": f"crewai_{action}",
                    "actor": {
                        "id": actor_id,
                        "name": actor_name,
                        "owner": "crewai"
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


# Default client
_default_client = None


def get_client() -> AportVerify:
    """Get or create default APort client"""
    global _default_client
    if _default_client is None:
        _default_client = AportVerify()
    return _default_client


def set_client(client: AportVerify):
    """Set default client"""
    global _default_client
    _default_client = client


def aport_verify(
    action: str,
    actor_id_from_context: Callable = None,
    context_builder: Callable = None,
    client: AportVerify = None
):
    """
    Decorator to verify CrewAI task with APort before execution.
    
    Usage:
        @aport_verify("execute_task")
        def my_task(context):
            # task logic
            return result
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get client
            verif_client = client or get_client()
            
            # Get actor info
            actor_id = "crewai-agent"
            actor_name = "crewai"
            
            if actor_id_from_context and args:
                try:
                    actor_id = actor_id_from_context(args[0])
                except:
                    pass
            
            # Build context
            context = {"task": func.__name__}
            if context_builder and args:
                try:
                    context.update(context_builder(args[0]))
                except:
                    pass
            
            # Also include kwargs
            context.update(kwargs)
            
            # Verify
            if not verif_client.verify(action, actor_id, actor_name, context):
                raise APortVerificationError(
                    f"Task {func.__name__} blocked by APort verification"
                )
            
            # Execute task
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


# Example usage with CrewAI
example_code = '''
from crewai import Agent, Task, Crew
from aport_crewai import aport_verify

# Define a task with verification
@aport_verify(
    action="research_task",
    context_builder=lambda ctx: {"input": ctx.get("input")}
)
def research_task(agent, context):
    """Research task that requires APort verification"""
    # Task logic here
    return {"result": "research complete"}

# Or use the decorator on a function called by CrewAI task
@aport_verify("data_processing")
def process_data(data):
    """Process data with APort verification"""
    # Processing logic
    return processed_data
'''


if __name__ == "__main__":
    # Test
    client = AportVerify(api_key="test-key")
    print("AportVerify decorator initialized!")
    print(f"Enabled: {client.enabled}")
