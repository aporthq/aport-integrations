"""LangGraph checkpoint guard with APort verification."""

import logging
from typing import Dict, Any, Optional, Callable, List, Union
from functools import wraps

# Mock LangGraph components for demonstration (replace with real imports in production)
try:
    from langgraph.checkpoint import BaseCheckpointSaver
    from langgraph.graph import StateGraph
    from langchain_core.runnables import RunnableConfig
except ImportError:
    # Mock classes for development/demo without LangGraph installed
    class BaseCheckpointSaver:
        async def aget(self, config): pass
        async def aput(self, config, checkpoint): pass
    
    class StateGraph:
        def __init__(self, schema): 
            self.schema = schema
            self.nodes = {}
            self.edges = []
            self.conditional_edges = []
    
    class RunnableConfig:
        pass

from client import APortClient
from exceptions import VerificationError, CheckpointError, ConfigurationError

logger = logging.getLogger(__name__)


class APortCheckpointGuard:
    """APort verification guard for LangGraph checkpoints and state transitions."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_policy: str = "workflow.transition.v1",
        strict_mode: bool = True,
        use_mock: bool = True
    ):
        """Initialize the checkpoint guard.
        
        Args:
            api_key: APort API key
            base_url: APort API base URL
            default_policy: Default policy for verification
            strict_mode: Whether to raise exceptions on verification failure
            use_mock: Whether to use mock client for development
        """
        self.client = APortClient(
            api_key=api_key,
            base_url=base_url,
            use_mock=use_mock
        )
        self.default_policy = default_policy
        self.strict_mode = strict_mode
        self.verification_rules: Dict[str, Dict[str, Any]] = {}
        
        logger.info(f"Initialized APortCheckpointGuard with policy: {default_policy}")
    
    def add_verification_rule(
        self,
        state_name: str,
        policy: Optional[str] = None,
        required_capabilities: Optional[List[str]] = None,
        context_extractor: Optional[Callable] = None
    ):
        """Add a verification rule for a specific state.
        
        Args:
            state_name: Name of the state to protect
            policy: Policy to use for this state (defaults to default_policy)
            required_capabilities: Required agent capabilities
            context_extractor: Function to extract context from state
        """
        self.verification_rules[state_name] = {
            "policy": policy or self.default_policy,
            "required_capabilities": required_capabilities or [],
            "context_extractor": context_extractor
        }
        logger.info(f"Added verification rule for state: {state_name}")
    
    def require_verification(
        self,
        policy: Optional[str] = None,
        agent_id_extractor: Optional[Callable] = None
    ):
        """Decorator to add APort verification to LangGraph node functions.
        
        Args:
            policy: Policy to verify against
            agent_id_extractor: Function to extract agent ID from state
            
        Returns:
            Decorated function that verifies before execution
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(state: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
                # Extract agent ID
                agent_id = self._extract_agent_id(state, agent_id_extractor)
                if not agent_id:
                    if self.strict_mode:
                        raise CheckpointError("Agent ID not found in state")
                    logger.warning("Agent ID not found, skipping verification")
                    return await func(state, config)
                
                # Get policy for verification
                verification_policy = policy or self.default_policy
                
                # Extract node name from function
                node_name = getattr(func, '__name__', 'unknown_node')
                
                try:
                    # Verify checkpoint
                    verification_result = await self.client.verify_checkpoint(
                        policy=verification_policy,
                        agent_id=agent_id,
                        checkpoint_id=f"node_{node_name}",
                        state=state,
                        context={
                            "node_name": node_name,
                            "function": func.__name__,
                            "config": config.get("configurable", {}) if config else {}
                        }
                    )
                    
                    logger.info(f"Verification successful for node {node_name}, agent {agent_id}")
                    
                    # Add verification info to state
                    state["_aport_verification"] = verification_result
                    
                    # Execute the original function
                    return await func(state, config)
                    
                except VerificationError as e:
                    logger.error(f"Verification failed for node {node_name}: {e}")
                    if self.strict_mode:
                        raise CheckpointError(f"Node {node_name} verification failed: {e}")
                    # In non-strict mode, add error info and continue
                    state["_aport_verification_error"] = str(e)
                    return await func(state, config)
            
            return wrapper
        return decorator
    
    def protect_graph(
        self,
        graph: StateGraph,
        agent_id_extractor: Optional[Callable] = None,
        checkpoint_policies: Optional[Dict[str, str]] = None
    ) -> StateGraph:
        """Protect an entire StateGraph with APort verification.
        
        Args:
            graph: LangGraph StateGraph to protect
            agent_id_extractor: Function to extract agent ID from state
            checkpoint_policies: Mapping of node names to policies
            
        Returns:
            Protected StateGraph
        """
        # Create a new graph with the same structure
        protected_graph = StateGraph(graph.schema)
        
        # Copy nodes with verification wrapper
        for node_name, node_func in graph.nodes.items():
            policy = checkpoint_policies.get(node_name) if checkpoint_policies else None
            protected_func = self.require_verification(
                policy=policy,
                agent_id_extractor=agent_id_extractor
            )(node_func)
            protected_graph.add_node(node_name, protected_func)
        
        # Copy edges
        for start, end in graph.edges:
            protected_graph.add_edge(start, end)
        
        # Copy conditional edges
        for start, condition_func, edge_mapping in graph.conditional_edges:
            protected_graph.add_conditional_edges(start, condition_func, edge_mapping)
        
        # Set entry point
        if hasattr(graph, 'entry_point'):
            protected_graph.set_entry_point(graph.entry_point)
        
        # Set finish point
        if hasattr(graph, 'finish_point'):
            protected_graph.set_finish_point(graph.finish_point)
        
        logger.info(f"Protected graph with {len(graph.nodes)} nodes")
        return protected_graph
    
    async def verify_transition(
        self,
        agent_id: str,
        from_state: str,
        to_state: str,
        state_data: Dict[str, Any],
        policy: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Verify a state transition.
        
        Args:
            agent_id: Agent identifier
            from_state: Source state
            to_state: Target state
            state_data: State data
            policy: Policy to verify against
            context: Additional context
            
        Returns:
            Verification result
        """
        verification_policy = policy or self.default_policy
        
        return await self.client.verify_state_transition(
            policy=verification_policy,
            agent_id=agent_id,
            from_state=from_state,
            to_state=to_state,
            state_data=state_data,
            context=context
        )
    
    def _extract_agent_id(
        self,
        state: Dict[str, Any],
        extractor: Optional[Callable] = None
    ) -> Optional[str]:
        """Extract agent ID from state.
        
        Args:
            state: State dictionary
            extractor: Custom extraction function
            
        Returns:
            Agent ID or None
        """
        if extractor:
            return extractor(state)
        
        # Default extraction strategies
        agent_id_keys = ["agent_id", "agentId", "agent", "user_id", "userId"]
        for key in agent_id_keys:
            if key in state:
                return str(state[key])
        
        # Check nested structures
        if "config" in state and isinstance(state["config"], dict):
            for key in agent_id_keys:
                if key in state["config"]:
                    return str(state["config"][key])
        
        return None


class APortCheckpointSaver(BaseCheckpointSaver):
    """Custom checkpoint saver that integrates APort verification."""
    
    def __init__(
        self,
        base_saver: BaseCheckpointSaver,
        guard: APortCheckpointGuard,
        agent_id_extractor: Optional[Callable] = None
    ):
        """Initialize the checkpoint saver.
        
        Args:
            base_saver: Underlying checkpoint saver
            guard: APort checkpoint guard
            agent_id_extractor: Function to extract agent ID
        """
        self.base_saver = base_saver
        self.guard = guard
        self.agent_id_extractor = agent_id_extractor
        
    async def aget(self, config: RunnableConfig):
        """Get checkpoint with verification."""
        return await self.base_saver.aget(config)
    
    async def aput(self, config: RunnableConfig, checkpoint: Dict[str, Any]):
        """Put checkpoint with verification."""
        # Extract agent ID from checkpoint or config
        agent_id = self._extract_agent_id_from_checkpoint(checkpoint, config)
        
        if agent_id and self.guard.strict_mode:
            try:
                # Verify checkpoint save operation
                await self.guard.client.verify_checkpoint(
                    policy=self.guard.default_policy,
                    agent_id=agent_id,
                    checkpoint_id=f"save_{config.get('run_id', 'unknown')}",
                    state=checkpoint,
                    context={"operation": "save_checkpoint"}
                )
            except VerificationError as e:
                logger.error(f"Checkpoint save verification failed: {e}")
                raise CheckpointError(f"Checkpoint save denied: {e}")
        
        return await self.base_saver.aput(config, checkpoint)
    
    def _extract_agent_id_from_checkpoint(
        self,
        checkpoint: Dict[str, Any],
        config: RunnableConfig
    ) -> Optional[str]:
        """Extract agent ID from checkpoint or config."""
        if self.agent_id_extractor:
            return self.agent_id_extractor(checkpoint)
        
        # Try to extract from checkpoint data
        if "state" in checkpoint:
            return self.guard._extract_agent_id(checkpoint["state"])
        
        # Try to extract from config
        configurable = config.get("configurable", {})
        return configurable.get("agent_id") or configurable.get("user_id")