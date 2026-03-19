# FastAPI with APort Example

FastAPI application with integrated APort verification middleware.

## Features

- Automatic request verification via middleware
- Configurable exempt paths
- Manual verification function
- Health check endpoint
- Protected routes

## Installation

```bash
pip install fastapi uvicorn httpx
```

## Configuration

Set environment variables:

```bash
export APORT_API_KEY=your-api-key
export APORT_PROJECT_ID=your-project-id
export APORT_ENABLED=true
```

Or create `.env` file:

```
APORT_API_KEY=your-api-key
APORT_PROJECT_ID=default
APORT_ENABLED=true
```

## Run

```bash
python main.py
```

Server runs on http://localhost:8000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint |
| `/health` | GET | Health check (exempt) |
| `/api/protected` | GET | Protected route |
| `/api/data` | POST | Protected POST |
| `/api/user/{id}` | GET | Protected user endpoint |
| `/api/verify` | POST | Manual verification |

## Middleware Configuration

```python
app.add_middleware(
    APortMiddleware,
    exempt_paths=["/health", "/docs", "/openapi.json"]
)
```

## Manual Verification

```python
from main import verify_action

result = await verify_action(
    action="custom_action",
    actor_id="user-123",
    context={"key": "value"}
)
```

## Docker

```dockerfile
FROM python:3.10
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "main.py"]
```

```bash
docker build -t aport-fastapi .
docker run -p 8000:8000 \
  -e APORT_API_KEY=your-key \
  aport-fastapi
```

## License

MIT
