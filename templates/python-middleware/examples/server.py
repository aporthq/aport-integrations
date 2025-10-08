"""FastAPI server example with APort middleware."""

import os
from typing import Dict, Any
from fastapi import FastAPI, Request, Depends, HTTPException
from pydantic import BaseModel
from aport_middleware import APortMiddleware, require_policy

# Initialize FastAPI app
app = FastAPI(
    title="APort FastAPI Example",
    description="Example FastAPI application with APort middleware",
    version="1.0.0"
)

# Initialize APort middleware
aport_middleware = APortMiddleware(
    api_key=os.getenv('APORT_API_KEY'),
    base_url=os.getenv('APORT_BASE_URL')
)

# Pydantic models
class RefundRequest(BaseModel):
    amount: float
    order_id: str
    agent_id: str = None

class RefundResponse(BaseModel):
    success: bool
    refund_id: str
    amount: float
    order_id: str
    agent_id: str

# Routes
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "APort FastAPI Example",
        "version": "1.0.0",
        "endpoints": {
            "GET /public": "Public endpoint (no verification)",
            "POST /refund": "Refund endpoint (requires finance.payment.refund.v1 policy)",
            "GET /admin": "Admin endpoint (requires admin.access policy)"
        }
    }

@app.get("/public")
async def public_endpoint():
    """Public endpoint that doesn't require verification."""
    return {
        "message": "This is a public endpoint",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.post("/refund", response_model=RefundResponse)
async def process_refund(
    request: RefundRequest,
    aport_data: Dict[str, Any] = Depends(
        aport_middleware.require_policy(
            "finance.payment.refund.v1",
            context={"endpoint": "refund", "action": "process_refund"}
        )
    )
):
    """Process a refund with APort verification."""
    # Access verification result
    passport = aport_data['passport']
    agent_id = aport_data['agent_id']
    
    # Check specific limits
    if request.amount > passport.get('limits', {}).get('refund_amount_max_per_tx', 0):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Refund amount exceeds limit",
                "requested": request.amount,
                "limit": passport.get('limits', {}).get('refund_amount_max_per_tx')
            }
        )
    
    # Process refund
    refund_id = f"refund_{int(request.amount * 100)}"
    
    return RefundResponse(
        success=True,
        refund_id=refund_id,
        amount=request.amount,
        order_id=request.order_id,
        agent_id=agent_id
    )

@app.get("/admin")
async def admin_dashboard(
    aport_data: Dict[str, Any] = Depends(
        aport_middleware.require_policy(
            "admin.access",
            context={"endpoint": "admin", "action": "view_dashboard"}
        )
    )
):
    """Admin dashboard with APort verification."""
    passport = aport_data['passport']
    agent_id = aport_data['agent_id']
    
    return {
        "message": "Admin dashboard",
        "user": {
            "agent_id": agent_id,
            "capabilities": passport.get('capabilities', []),
            "limits": passport.get('limits', {})
        },
        "timestamp": "2024-01-01T00:00:00Z"
    }

# Alternative: Using the convenience function
@app.post("/transfer")
async def transfer_funds(
    request: Request,
    aport_data: Dict[str, Any] = Depends(
        require_policy(
            "payments.transfer.v1",
            context={"endpoint": "transfer", "action": "process_transfer"}
        )
    )
):
    """Transfer funds using the convenience function."""
    return {
        "message": "Transfer processed",
        "agent_id": aport_data['agent_id'],
        "verified": aport_data['verified']
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
