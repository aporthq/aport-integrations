# APort FastAPI Middleware

APort middleware for FastAPI applications that provides agent verification and policy enforcement.

## 🚀 Quick Start

### Installation

```bash
# Install the official APort FastAPI middleware
pip install agent-passport-middleware-fastapi

# Or install the core SDK separately
pip install aporthq-sdk-python
```

### Basic Usage

```python
from fastapi import FastAPI, Depends
from aport_middleware import APortMiddleware

app = FastAPI()

# Initialize middleware
aport_middleware = APortMiddleware(
    api_key="your_api_key_here"
)

# Protect a route
@app.post("/refund")
async def process_refund(
    request: Request,
    aport_data: dict = Depends(
        aport_middleware.require_policy("payments.refund.v1")
    )
):
    # Agent is verified, access passport data
    passport = aport_data["passport"]
    agent_id = aport_data["agent_id"]
    
    return {"success": True, "agent_id": agent_id}
```

## 📚 API Reference

### `APortMiddleware`

Main middleware class for FastAPI applications.

```python
middleware = APortMiddleware(
    api_key="your_api_key",  # or use APORT_API_KEY env var
    base_url="https://api.aport.io"  # optional
)
```

### `require_policy(policy, context=None, strict=True)`

Create a FastAPI dependency that requires a specific policy.

**Parameters:**
- `policy` (str): Policy pack identifier
- `context` (dict): Additional context for verification
- `strict` (bool): Whether to fail on verification errors

**Returns:** FastAPI dependency function

### `require_policy()` (Convenience Function)

Create a policy dependency without instantiating middleware.

```python
from aport_middleware import require_policy

@app.post("/transfer")
async def transfer(
    aport_data: dict = Depends(
        require_policy("payments.transfer.v1")
    )
):
    return {"success": True}
```

## 🔧 Configuration

### Environment Variables

```bash
APORT_API_KEY=your_api_key_here
APORT_BASE_URL=https://api.aport.io  # optional
```

### Agent ID Sources

The middleware looks for agent IDs in the following order:

1. `X-Agent-ID` header
2. `X-APort-Agent-ID` header
3. `agent_id` query parameter
4. `agent_id` in request body
5. `agentId` in request body

## 📝 Examples

### Basic Route Protection

```python
@app.post("/refund")
async def process_refund(
    request: Request,
    aport_data: dict = Depends(
        aport_middleware.require_policy("payments.refund.v1")
    )
):
    passport = aport_data["passport"]
    
    # Check specific limits
    if request.json()["amount"] > passport["limits"]["refund_amount_max_per_tx"]:
        raise HTTPException(
            status_code=403,
            detail="Amount exceeds limit"
        )
    
    return {"success": True}
```

### Admin Access

```python
@app.get("/admin")
async def admin_dashboard(
    aport_data: dict = Depends(
        aport_middleware.require_policy(
            "admin.access",
            context={"endpoint": "admin", "action": "view_dashboard"}
        )
    )
):
    return {
        "message": "Admin dashboard",
        "capabilities": aport_data["passport"]["capabilities"]
    }
```

### Custom Context

```python
@app.post("/transfer")
async def transfer_funds(
    aport_data: dict = Depends(
        aport_middleware.require_policy(
            "payments.transfer.v1",
            context={
                "source": "api",
                "version": "v1",
                "endpoint": "transfer"
            }
        )
    )
):
    # Handle transfer
    pass
```

### Non-Strict Mode

```python
@app.post("/optional-verify")
async def optional_endpoint(
    aport_data: dict = Depends(
        aport_middleware.require_policy(
            "optional.policy",
            strict=False
        )
    )
):
    if aport_data["verified"]:
        return {"message": "Verified access"}
    else:
        return {"message": "Unverified access"}
```

## 🧪 Testing

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=aport_middleware

# Run linting
flake8 src/
black src/
mypy src/
```

## 📄 License

MIT
