"""APort client wrapper for LangGraph integration."""

import os
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Union
from exceptions import APortError, VerificationError, ConfigurationError

# Production HTTP client import
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logging.warning("aiohttp not available - using mock client only")

logger = logging.getLogger(__name__)


class MockAPortSDK:
    """Mock APort SDK matching real API structure."""

    def __init__(self, api_key: str, base_url: str = "https://api.aport.io"):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        logger.info(f"[MOCK] Initialized APort client with base URL: {base_url}")

    async def verify_policy(
        self,
        agent_id: str,
        policy_id: str,
        context: Dict[str, Any] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Mock policy verification matching real APort API.
        Real endpoint: POST /api/verify/policy/{policy_id}
        """
        logger.info(f"[MOCK] POST {self.base_url}/api/verify/policy/{policy_id}")
        logger.info(f"[MOCK] Agent: {agent_id}, Context: {context}")

        # Simulate API delay
        await asyncio.sleep(0.1)

        # Mock logic: deny agents ending in "_denied" or containing "denied"
        allow = not ("denied" in agent_id.lower() or agent_id.endswith("_denied"))

        # Generate mock decision response
        decision_id = f"dec_mock_{hash(agent_id + policy_id) % 10000:04d}"
        
        response = {
            "decision": {
                "decision_id": decision_id,
                "allow": allow,
                "reasons": [] if allow else [{
                    "code": "MOCK_DENIAL",
                    "message": f"Mock denial for agent {agent_id}",
                    "severity": "error"
                }],
                "expires_in": 60,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "assurance_level": "high" if allow else "none"
            },
            "verified": allow,
            "passport": {
                "agent_id": agent_id,
                "capabilities": ["read", "write"] if allow else [],
                "limits": {"requests": 1000, "period": "1h"} if allow else {}
            } if allow else None
        }

        return response


class RealAPortClient:
    """Real APort API client implementation."""

    def __init__(self, api_key: str, base_url: str = "https://api.aport.io"):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "aport-langgraph-integration/1.0.0"
        }

    async def verify_policy(
        self,
        agent_id: str,
        policy_id: str,
        context: Dict[str, Any] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Call real APort policy verification API."""
        url = f"{self.base_url}/api/verify/policy/{policy_id}"

        headers = self.headers.copy()
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        payload = {
            "agent_id": agent_id,
            "context": context or {},
        }
        if idempotency_key:
            payload["idempotency_key"] = idempotency_key

        try:
            if not AIOHTTP_AVAILABLE:
                raise APortError("aiohttp not available for real API calls")

            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers, timeout=10) as response:
                    result = await response.json()

                    if response.status >= 400:
                        raise APortError(
                            f"APort API error: {result.get('message', 'Unknown error')}",
                            status_code=response.status,
                            details=result
                        )

                    return result
        except aiohttp.ClientError as e:
            raise APortError(f"Network error: {str(e)}")
        except Exception as e:
            raise APortError(f"API call failed: {str(e)}")


class APortClient:
    """APort client wrapper for LangGraph node verification."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 10,
        use_mock: bool = True  # Use mock by default for development
    ):
        """Initialize APort client.
        
        Args:
            api_key: APort API key. If not provided, uses APORT_API_KEY env var
            base_url: APort API base URL. If not provided, uses APORT_BASE_URL env var
            timeout: Request timeout in seconds
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
                self.client = RealAPortClient(self.api_key, self.base_url)
                logger.info("Using real APort client for production")
            except Exception as e:
                logger.warning(f"Failed to initialize real client, falling back to mock: {e}")
                self.client = MockAPortSDK(self.api_key, self.base_url)
                
    async def verify_checkpoint(
        self,
        policy: str,
        agent_id: str,
        checkpoint_id: str,
        state: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Verify agent authorization for a checkpoint transition."""
        try:
            # Build verification context
            verification_context = {
                "checkpoint_id": checkpoint_id,
                "state_keys": list(state.keys()) if state else [],
                "timestamp": datetime.utcnow().isoformat(),
                **(context or {})
            }

            logger.info(f"Verifying checkpoint {checkpoint_id} for agent {agent_id}")

            # Call APort policy verification API
            result = await self.client.verify_policy(
                agent_id=agent_id,
                policy_id=policy,
                context=verification_context
            )

            # Extract decision from response
            decision = result.get("decision", {})
            if not decision.get("allow", False):
                reasons = decision.get("reasons", [])
                raise VerificationError(
                    f"Agent {agent_id} verification failed for checkpoint {checkpoint_id}",
                    details={"reasons": reasons, "decision_id": decision.get("decision_id")},
                    agent_id=agent_id
                )

            logger.info(f"Checkpoint {checkpoint_id} verification successful for agent {agent_id}")

            return {
                "verified": True,
                "agent_id": agent_id,
                "policy": policy,
                "checkpoint_id": checkpoint_id,
                "decision_id": decision.get("decision_id"),
                "expires_in": decision.get("expires_in"),
                "created_at": decision.get("created_at")
            }

        except VerificationError:
            raise
        except Exception as e:
            logger.error(f"Checkpoint verification error: {e}")
            raise APortError(f"Checkpoint verification failed: {str(e)}")
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
            
            # Call APort policy verification API
            result = await self.client.verify_policy(
                agent_id=agent_id,
                policy_id=policy,
                context=verification_context
            )
            
            # Extract decision from response
            decision = result.get("decision", {})
            if not decision.get("allow", False):
                reasons = decision.get("reasons", [])
                raise VerificationError(
                    f"Agent {agent_id} verification failed for checkpoint {checkpoint_id}",
                    details={"reasons": reasons, "decision_id": decision.get("decision_id")},
                    agent_id=agent_id
                )
            
            logger.info(f"Checkpoint {checkpoint_id} verification successful for agent {agent_id}")
            
            return {
                "verified": True,
                "agent_id": agent_id,
                "policy": policy,
                "checkpoint_id": checkpoint_id,
                "decision_id": decision.get("decision_id"),
                "expires_in": decision.get("expires_in"),
                "created_at": decision.get("created_at")
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