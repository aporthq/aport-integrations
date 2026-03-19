"""
FastAPI application with APort verification middleware.
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
import httpx
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="APort FastAPI Example")

# Configuration
APORT_API_KEY = os.getenv("APORT_API_KEY", "")
APORT_PROJECT_ID = os.getenv("APORT_PROJECT_ID", "default")
APORT_ENABLED = os.getenv("APORT_ENABLED", "true").lower() == "true"


class APortMiddleware(BaseHTTPMiddleware):
    """APort verification middleware for FastAPI"""
    
    def __init__(self, app, exempt_paths: list = None):
        super().__init__(app)
        self.exempt_paths = exempt_paths or ["/health", "/docs", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next):
        # Skip exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # Skip if disabled
        if not APORT_ENABLED:
            return await call_next(request)
        
        # Verify with APort
        result = await self.verify(request)
        
        if not result.get("allow", True):
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Denied",
                    "reasons": result.get("reasons", [])
                }
            )
        
        return await call_next(request)
    
    async def verify(self, request: Request) -> dict:
        """Verify request with APort"""
        if not APORT_API_KEY:
            logger.warning("APort API key not configured")
            return {"allow": True, "reasons": ["No API key"]}
        
        # Get actor info
        actor_id = "anonymous"
        actor_name = "anonymous"
        
        # Try to get from header or auth
        auth_header = request.headers.get("authorization", "")
        if auth_header:
            actor_id = f"token_{hash(auth_header) % 10000}"
        
        # Build context
        context = {
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "")[:200]
        }
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    "https://api.aport.io/verify",
                    json={
                        "action": f"fastapi_{request.method.lower()}",
                        "actor": {
                            "id": actor_id,
                            "name": actor_name,
                            "owner": "fastapi"
                        },
                        "context": {"data": context},
                        "projectId": APORT_PROJECT_ID
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {APORT_API_KEY}"
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"APort API error: {response.status_code}")
                    return {"allow": True, "reasons": ["API error"]}
                    
        except httpx.TimeoutException:
            logger.error("APort request timeout")
            return {"allow": True, "reasons": ["Timeout"]}
        except Exception as e:
            logger.error(f"APort verification error: {e}")
            return {"allow": True, "reasons": ["Verification failed"]}


# Add middleware
app.add_middleware(
    APortMiddleware,
    exempt_paths=["/health", "/docs", "/openapi.json", "/redoc"]
)


# Routes
@app.get("/")
async def root():
    return {"message": "FastAPI with APort Example", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/protected")
async def protected_route():
    return {"message": "This is a protected route", "data": "secret"}


@app.post("/api/data")
async def create_data(request: Request):
    body = await request.json()
    return {"message": "Data created", "data": body}


@app.get("/api/user/{user_id}")
async def get_user(user_id: int):
    return {"user_id": user_id, "name": f"User {user_id}"}


# Example: Manual verification
async def verify_action(action: str, actor_id: str, context: dict) -> dict:
    """Manual verification function"""
    if not APORT_API_KEY:
        return {"allow": True}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://api.aport.io/verify",
                json={
                    "action": action,
                    "actor": {
                        "id": actor_id,
                        "name": "api_user",
                        "owner": "fastapi"
                    },
                    "context": {"data": context},
                    "projectId": APORT_PROJECT_ID
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {APORT_API_KEY}"
                }
            )
            return response.json()
    except:
        return {"allow": True}


@app.post("/api/verify")
async def manual_verify(action: str, actor_id: str = "default"):
    """Manual verification endpoint"""
    result = await verify_action(action, actor_id, {"source": "manual"})
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
