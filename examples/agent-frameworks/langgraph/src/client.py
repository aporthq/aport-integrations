"""APort client wrapper for LangGraph integration."""

import os
import asyncio
import logging
from typing import Dict, Any, Optional, Union
from exceptions import APortError, VerificationError, ConfigurationError

logger = logging.getLogger(__name__)


class MockVerificationResult:
    """Mock verification result for development and testing."""
    
    def __init__(self, verified: bool = True, agent_id: str = None, policy: str = None):
        self.verified = verified
        self.agent_id = agent_id
        self.policy = policy
        self.passport = {
            "agent_id": agent_id,
            "capabilities": ["read", "write", "execute"],
            "limits": {"requests": 1000, "period": "1h"},
            "verification_level": "domain"
        } if verified else None
        self.message = "Mock verification successful" if verified else "Mock verification failed"
        self.details = {"mock": True}


class MockAPortSDK:
    """Mock APort SDK for development and testing."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.aport.io"):
        self.api_key = api_key
        self.base_url = base_url
        logger.info(f"[MOCK] Initialized APort client with base URL: {base_url}")
    
    async def verify(self, policy: str, agent_id: str, context: Dict[str, Any] = None) -> MockVerificationResult:
        """Mock verification - simulates APort API call."""
        logger.info(f"[MOCK] Verifying agent {agent_id} against policy {policy}")
        
        # Simulate API delay
        await asyncio.sleep(0.1)
        
        # Mock logic: fail verification for agents ending in "_denied"
        verified = not agent_id.endswith("_denied")
        
        return MockVerificationResult(verified=verified, agent_id=agent_id, policy=policy)


class APortClient:
    """APort client wrapper for LangGraph checkpoint verification."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 5000,
        use_mock: bool = True  # Use mock by default for development
    ):
        """Initialize APort client.
        
        Args:
            api_key: APort API key. If not provided, uses APORT_API_KEY env var
            base_url: APort API base URL. If not provided, uses APORT_BASE_URL env var
            timeout: Request timeout in milliseconds
            use_mock: Whether to use mock client for development/testing
        """
        self.api_key = api_key or os.getenv("APORT_API_KEY")
        self.base_url = base_url or os.getenv("APORT_BASE_URL", "https://api.aport.io")
        self.timeout = timeout
        self.use_mock = use_mock
        
        if not self.api_key:
            raise ConfigurationError("APort API key is required. Set APORT_API_KEY environment variable.")
        
        # Initialize the appropriate client
        if self.use_mock:
            self.client = MockAPortSDK(self.api_key, self.base_url)
            logger.warning("Using mock APort client for development/testing")
        else:
            try:
                # In production, uncomment this and remove mock
                # from aporthq_sdk import APortClient as RealAPortClient
                # self.client = RealAPortClient(api_key=self.api_key, base_url=self.base_url)
                
                # For now, fall back to mock
                self.client = MockAPortSDK(self.api_key, self.base_url)
                logger.warning("Production APort SDK not available, using mock client")
            except ImportError:
                logger.warning("APort SDK not installed, using mock client")
                self.client = MockAPortSDK(self.api_key, self.base_url)
    
    async def verify_checkpoint(
        self,
        policy: str,
        agent_id: str,
        checkpoint_id: str,
        state: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Verify agent authorization for a checkpoint transition.
        
        Args:
            policy: Policy pack identifier (e.g., 'workflow.transition.v1')
            agent_id: Agent identifier
            checkpoint_id: Checkpoint identifier
            state: Current state data
            context: Additional verification context
            
        Returns:
            Verification result dictionary
            
        Raises:
            VerificationError: If verification fails
            APortError: If verification request fails
        """
        try:
            # Build verification context
            verification_context = {
                "checkpoint_id": checkpoint_id,
                "state_keys": list(state.keys()) if state else [],
                "timestamp": str(asyncio.get_event_loop().time()),
                **(context or {})
            }
            
            logger.info(f"Verifying checkpoint {checkpoint_id} for agent {agent_id}")
            
            # Call APort verification
            result = await self.client.verify(policy, agent_id, verification_context)
            
            if not result.verified:
                raise VerificationError(
                    f"Agent {agent_id} verification failed for checkpoint {checkpoint_id}",
                    details=result.details,
                    agent_id=agent_id
                )
            
            logger.info(f"Checkpoint {checkpoint_id} verification successful for agent {agent_id}")
            
            return {
                "verified": True,
                "agent_id": agent_id,
                "policy": policy,
                "checkpoint_id": checkpoint_id,
                "passport": result.passport,
                "message": result.message,
                "details": result.details
            }
            
        except VerificationError:
            raise
        except Exception as e:
            logger.error(f"Checkpoint verification error: {e}")
            raise APortError(f"Checkpoint verification failed: {str(e)}")
    
    async def verify_state_transition(
        self,
        policy: str,
        agent_id: str,
        from_state: str,
        to_state: str,
        state_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Verify agent authorization for a state transition.
        
        Args:
            policy: Policy pack identifier
            agent_id: Agent identifier
            from_state: Source state name
            to_state: Target state name
            state_data: State data
            context: Additional verification context
            
        Returns:
            Verification result dictionary
            
        Raises:
            VerificationError: If verification fails
        """
        verification_context = {
            "transition": f"{from_state} -> {to_state}",
            "from_state": from_state,
            "to_state": to_state,
            "state_data_size": len(str(state_data)) if state_data else 0,
            **(context or {})
        }
        
        return await self.verify_checkpoint(
            policy=policy,
            agent_id=agent_id,
            checkpoint_id=f"transition_{from_state}_to_{to_state}",
            state=state_data,
            context=verification_context
        )