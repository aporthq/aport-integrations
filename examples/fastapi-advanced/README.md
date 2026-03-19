# FastAPI Advanced APort Integration

Advanced FastAPI integration with APort verification, featuring middleware, dependency injection, caching, and rate limiting.

## What It Does

- **Middleware** - Automatic verification for all routes
- **Dependency Injection** - Manual verification when needed
- **Caching** - Reduce API calls with built-in cache
- **Rate Limiting** - Prevent abuse
- **Decorator** - Route-level protection

## Installation

```bash
pip install fastapi uvicorn httpx pytest pytest-asyncio
```

## Quick Start

```python
from aport_fastapi import create_app

app = create_app()
```

## Configuration

```python
from aport_fastapi import APortConfig

config = APortConfig(
    api_key="your-api-key",
    project_id="default",
    enabled=True,
    timeout=5.0,
    exempt_paths=["/health", "/docs"],
    cache_ttl=60,
    rate_limit=100
)
```

## Usage

### Middleware (Automatic)

All routes are automatically verified:

```python
from aport_fastapi import create_app

app = create_app()

# All routes are protected by default
@app.get("/data")
async def get_data():
    return {"data": "protected"}
```

### Dependency (Manual)

Use dependency injection for specific routes:

```python
from fastapi import Depends
from aport_fastapi import verify_action, VerificationResult

@app.get("/protected")
async def protected_route(
    verification: VerificationResult = Depends(
        lambda: verify_action("read_data", "user-1", "username")
    )
):
    if not verification.allow:
        raise HTTPException(403, verification.reasons)
    return {"data": "secret"}
```

### Decorator

Protect individual routes:

```python
from aport_fastapi import require_verification

@app.get("/admin")
@require_verification("admin_access")
async def admin_panel():
    return {"admin": True}
```

## Features

### Caching

Verification results are cached to reduce API calls:

```python
# Results are cached automatically
result1 = await client.verify("action", "user-1", "test")
# This call uses cache
result2 = await client.verify("action", "user-1", "test")
```

### Rate Limiting

Built-in rate limiting:

```python
config = APortConfig(rate_limit=100)  # 100 requests per minute
```

### Custom Client

```python
from aport_fastapi import APortClient, APortConfig

config = APortConfig(api_key="key", project_id="project")
client = APortClient(config)

result = await client.verify("action", "user-1", "username", {"key": "value"})
```

## API Reference

### APortConfig

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| api_key | str | env/APORT_API_KEY | Your API key |
| project_id | str | "default" | Project ID |
| enabled | bool | True | Enable verification |
| timeout | float | 5.0 | Request timeout |
| exempt_paths | list | [...] | Paths to skip |
| cache_ttl | int | 60 | Cache TTL (seconds) |
| rate_limit | int | 100 | Requests per minute |

### VerificationResult

```python
@dataclass
class VerificationResult:
    allow: bool
    reasons: List[str]
    cached: bool = False
```

## Testing

```bash
pytest tests/
```

## Example

See `example.py` for complete example:

```bash
cd examples/fastapi-advanced
python example.py
```

## License

MIT
