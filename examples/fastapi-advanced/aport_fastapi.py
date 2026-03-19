"""
Advanced FastAPI integration with APort verification.

This module provides comprehensive APort integration for FastAPI applications,
including middleware, dependency injection, and rate limiting.
"""

from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from typing import Optional, Callable, Dict, Any, List
import httpx
import os
import time
from functools import wraps
from dataclasses import dataclass
from enum import Enum


# Configuration
class APortConfig:
    """APort configuration"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        project_id: str = "default",
        enabled: bool = True,
        timeout: float = 5.0,
        exempt_paths: List[str] = None,
        cache_ttl: int = 60,
        rate_limit: int = 100,
    ):
        self.api_key = api_key or os.getenv("APORT_API_KEY", "")
        self.project_id = project_id
        self.enabled = enabled
        self.timeout = timeout
        self.exempt_paths = exempt_paths or ["/health", "/docs", "/openapi.json"]
        self.cache_ttl = cache_ttl
        self.rate_limit = rate_limit


# Cache for verification results
class VerificationCache:
    """Simple in-memory cache for verification results"""
    
    def __init__(self, ttl: int = 60):
        self.cache: Dict[str, tuple] = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached result"""
        if key in self.cache:
            result, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return result
            del self.cache[key]
        return None
    
    def set(self, key: str, value: Dict[str, Any]) -> None:
        """Set cached result"""
        self.cache[key] = (value, time.time())
    
    def clear(self) -> None:
        """Clear all cache"""
        self.cache.clear()


@dataclass
class VerificationResult:
    """Verification result"""
    allow: bool
    reasons: List[str]
    cached: bool = False


class APortClient:
    """APort API client"""
    
    def __init__(self, config: APortConfig):
        self.config = config
        self.cache = VerificationCache(config.cache_ttl)
    
    def _make_key(self, action: str, actor_id: str, context: Dict) -> str:
        """Generate cache key"""
        return f"{action}:{actor_id}:{hash(frozenset(context.items()))}"
    
    async def verify(
        self,
        action: str,
        actor_id: str,
        actor_name: str = "anonymous",
        context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
    ) -> VerificationResult:
        """Verify an action with APort"""
        
        if not self.config.enabled:
            return VerificationResult(allow=True, reasons=["Disabled"])
        
        if not self.config.api_key:
            return VerificationResult(allow=True, reasons=["No API key"])
        
        # Check cache
        ctx = context or {}
        cache_key = self._make_key(action, actor_id, ctx)
        
        if use_cache:
            cached = self.cache.get(cache_key)
            if cached:
                return VerificationResult(
                    allow=cached["allow"],
                    reasons=cached.get("reasons", []),
                    cached=True
                )
        
        # Make request
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.post(
                    "https://api.aport.io/verify",
                    json={
                        "action": action,
                        "actor": {
                            "id": actor_id,
                            "name": actor_name,
                            "owner": "fastapi"
                        },
                        "context": {"data": ctx},
                        "projectId": self.config.project_id
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.config.api_key}"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result = VerificationResult(
                        allow=data.get("allow", True),
                        reasons=data.get("reasons", [])
                    )
                    
                    # Cache successful results
                    if result.allow:
                        self.cache.set(cache_key, {
                            "allow": result.allow,
                            "reasons": result.reasons
                        })
                    
                    return result
                else:
                    return VerificationResult(
                        allow=True,
                        reasons=[f"API error: {response.status_code}"]
                    )
                    
        except httpx.TimeoutException:
            return VerificationResult(allow=True, reasons=["Timeout - allowed by default"])
        except Exception as e:
            return VerificationResult(allow=True, reasons=[f"Error: {str(e)}"])


# Rate limiter
class RateLimiter:
    """Simple rate limiter"""
    
    def __init__(self, max_requests: int = 100, window: int = 60):
        self.max_requests = max_requests
        self.window = window
        self.requests: Dict[str, List[float]] = {}
    
    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests
        self.requests[key] = [
            t for t in self.requests[key]
            if now - t < self.window
        ]
        
        # Check limit
        if len(self.requests[key]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[key].append(now)
        return True


# Global instances
config = APortConfig()
client = APortClient(config)
rate_limiter = RateLimiter(config.rate_limit)


# FastAPI Middleware
async def aport_middleware(request: Request, call_next):
    """APort middleware for FastAPI"""
    
    # Skip exempt paths
    for exempt in config.exempt_paths:
        if request.url.path.startswith(exempt):
            return await call_next(request)
    
    # Skip if disabled
    if not config.enabled:
        return await call_next(request)
    
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests"}
        )
    
    # Get actor info
    actor_id = "anonymous"
    actor_name = "anonymous"
    
    # Try to get from auth header
    auth_header = request.headers.get("authorization")
    if auth_header:
        actor_id = f"user-{hash(auth_header) % 10000}"
    
    # Build context
    context = {
        "method": request.method,
        "path": request.url.path,
        "ip": client_ip,
        "user_agent": request.headers.get("user-agent", "")[:200]
    }
    
    # Verify
    action = f"fastapi_{request.method.lower()}"
    result = await client.verify(
        action=action,
        actor_id=actor_id,
        actor_name=actor_name,
        context=context
    )
    
    if not result.allow:
        return JSONResponse(
            status_code=403,
            content={
                "error": "Access Denied",
                "reasons": result.reasons
            }
        )
    
    return await call_next(request)


# Dependency for manual verification
async def verify_action(
    action: str,
    actor_id: str,
    actor_name: str = "anonymous",
    context: Optional[Dict[str, Any]] = None,
) -> VerificationResult:
    """Dependency for verifying actions in endpoints"""
    return await client.verify(action, actor_id, actor_name, context)


# Decorator for route protection
def require_verification(action: str):
    """Decorator to require verification for a route"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request from args
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                raise HTTPException(
                    status_code=500,
                    detail="Request object not found"
                )
            
            # Verify
            actor_id = f"route-{action}"
            result = await client.verify(
                action=action,
                actor_id=actor_id,
                context={"path": str(request.url.path)}
            )
            
            if not result.allow:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied: {', '.join(result.reasons)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Example FastAPI app
def create_app() -> FastAPI:
    """Create FastAPI app with APort integration"""
    
    app = FastAPI(
        title="APort FastAPI Example",
        description="Advanced FastAPI integration with APort verification"
    )
    
    # Add middleware
    app.middleware("http")(aport_middleware)
    
    # Routes
    @app.get("/")
    async def root():
        return {"message": "APort FastAPI Example"}
    
    @app.get("/health")
    async def health():
        return {"status": "ok"}
    
    @app.get("/protected")
    async def protected_route(verification: VerificationResult = Depends(
        lambda: verify_action("read_data", "user-1", "test-user")
    )):
        if not verification.allow:
            raise HTTPException(403, verification.reasons)
        return {"data": "This is protected data"}
    
    @app.post("/api/verify")
    async def manual_verify(
        action: str,
        actor_id: str,
        actor_name: str = "anonymous"
    ):
        """Manual verification endpoint"""
        result = await client.verify(action, actor_id, actor_name)
        return {
            "allow": result.allow,
            "reasons": result.reasons,
            "cached": result.cached
        }
    
    return app


# Export
__all__ = [
    "APortConfig",
    "APortClient", 
    "VerificationResult",
    "VerificationCache",
    "RateLimiter",
    "aport_middleware",
    "verify_action",
    "require_verification",
    "create_app"
]


if __name__ == "__main__":
    import uvicorn
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)
