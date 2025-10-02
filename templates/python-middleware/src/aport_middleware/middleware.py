"""APort middleware implementation for FastAPI."""

import os
from typing import Optional, Dict, Any, Callable
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from aporthq_sdk import APortClient  # Uncomment when package is available
from .exceptions import APortError, VerificationError


class MockAPortClient:
    """Mock APort Client for template demonstration.
    
    In production, replace with: from aporthq_sdk import APortClient
    """
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, **kwargs):
        self.api_key = api_key
        self.base_url = base_url or 'https://api.aport.io'
    
    async def verify(self, policy: str, agent_id: str, context: Optional[Dict[str, Any]] = None) -> 'MockVerificationResult':
        """Mock verification - always returns success for template."""
        print(f"[MOCK] Verifying agent {agent_id} against policy {policy}")
        return MockVerificationResult(
            verified=True,
            passport={
                'agentId': agent_id,
                'capabilities': ['read', 'write'],
                'limits': {'requests': 1000, 'period': '1h'}
            },
            policy=policy,
            message="Mock verification successful"
        )


class MockVerificationResult:
    """Mock verification result for template demonstration."""
    
    def __init__(self, verified: bool, passport: Dict[str, Any], policy: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.verified = verified
        self.passport = passport
        self.policy = policy
        self.message = message
        self.details = details or {}


class APortMiddleware:
    """APort middleware for FastAPI applications."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        **kwargs
    ):
        """Initialize the APort middleware.
        
        Args:
            api_key: APort API key. If not provided, will use APORT_API_KEY env var.
            base_url: APort API base URL. If not provided, will use APORT_BASE_URL env var.
            **kwargs: Additional client options
        """
        self.client = MockAPortClient(
            api_key=api_key or os.getenv('APORT_API_KEY'),
            base_url=base_url or os.getenv('APORT_BASE_URL', 'https://api.aport.io'),
            **kwargs
        )
    
    def require_policy(
        self,
        policy: str,
        context: Optional[Dict[str, Any]] = None,
        strict: bool = True
    ) -> Callable:
        """Create a dependency that requires a specific policy.
        
        Args:
            policy: Policy pack identifier
            context: Additional context for verification
            strict: Whether to fail on verification errors
            
        Returns:
            FastAPI dependency function
        """
        async def policy_dependency(request: Request) -> Dict[str, Any]:
            """FastAPI dependency that verifies the policy."""
            try:
                # Extract agent ID from request
                agent_id = self._extract_agent_id(request)
                
                if not agent_id:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            'error': 'Agent ID required',
                            'message': 'Agent ID must be provided in headers, query, or body'
                        }
                    )
                
                # Prepare verification context
                verification_context = {
                    'method': request.method,
                    'path': request.url.path,
                    'user_agent': request.headers.get('user-agent'),
                    'ip': request.client.host if request.client else None,
                    **(context or {})
                }
                
                # Verify agent against policy
                result = await self.client.verify(
                    policy=policy,
                    agent_id=agent_id,
                    context=verification_context
                )
                
                if not result.verified:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            'error': 'Verification failed',
                            'message': result.message or 'Agent verification failed',
                            'details': result.details
                        }
                    )
                
                # Return verification result
                return {
                    'verified': True,
                    'passport': result.passport,
                    'policy': policy,
                    'agent_id': agent_id,
                    'result': result
                }
                
            except HTTPException:
                raise
            except Exception as error:
                if strict:
                    raise HTTPException(
                        status_code=500,
                        detail={
                            'error': 'Verification error',
                            'message': 'Internal verification error'
                        }
                    )
                
                # In non-strict mode, return unverified result
                return {
                    'verified': False,
                    'error': str(error)
                }
        
        return policy_dependency
    
    def _extract_agent_id(self, request: Request) -> Optional[str]:
        """Extract agent ID from request.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Agent ID or None if not found
        """
        # Check headers
        agent_id = request.headers.get('x-agent-id') or request.headers.get('x-aport-agent-id')
        if agent_id:
            return agent_id
        
        # Check query parameters
        agent_id = request.query_params.get('agent_id')
        if agent_id:
            return agent_id
        
        # Check JSON body (if available)
        if hasattr(request, '_json') and request._json:
            agent_id = request._json.get('agent_id') or request._json.get('agentId')
            if agent_id:
                return agent_id
        
        return None


# Convenience function for creating policy dependencies
def require_policy(
    policy: str,
    context: Optional[Dict[str, Any]] = None,
    strict: bool = True,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> Callable:
    """Create a policy dependency without instantiating middleware.
    
    Args:
        policy: Policy pack identifier
        context: Additional context for verification
        strict: Whether to fail on verification errors
        api_key: APort API key
        base_url: APort API base URL
        
    Returns:
        FastAPI dependency function
    """
    middleware = APortMiddleware(api_key=api_key, base_url=base_url)
    return middleware.require_policy(policy, context, strict)
