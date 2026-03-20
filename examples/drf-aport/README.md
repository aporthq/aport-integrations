# Django REST Framework + APort Integration Example

A minimal DRF project demonstrating [APort](https://aport.io) agent authentication and policy verification via custom permission classes.

## Prerequisites

- Python 3.10+
- An APort API key from [aport.io](https://aport.io)

## Setup

```bash
cd examples/drf-aport
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Configuration

```bash
export APORT_API_KEY=your-api-key-here
export DJANGO_SECRET_KEY=your-secret-key
# Optional
export APORT_BASE_URL=https://api.aport.io
export APORT_TIMEOUT_MS=5000
```

## Run

```bash
DJANGO_SETTINGS_MODULE=settings python -m django runserver --settings=settings 0.0.0.0:8000
```

## Endpoints

| Endpoint | Permission | Description |
|---|---|---|
| `GET /health` | None | Health check |
| `GET/POST /api/agent/info` | `APortAgentPermission` | Agent-verified info |
| `GET/POST /api/data/sensitive` | `APortPolicyPermission("data-access-policy")` | Policy-gated data |
| `POST /api/action/write` | `APortPolicyPermission("write-permission-policy")` | Policy-gated write |

## Sending Requests

```bash
# Health check
curl http://localhost:8000/health

# Agent auth via header
curl -H "X-Agent-Id: agent-abc123" http://localhost:8000/api/agent/info

# Agent auth via body
curl -X POST http://localhost:8000/api/agent/info \
  -H "Content-Type: application/json" \
  -d '{"passport": {"agent_id": "agent-abc123"}}'

# Policy-protected endpoint
curl -X POST http://localhost:8000/api/data/sensitive \
  -H "Content-Type: application/json" \
  -d '{"passport": {"agent_id": "agent-abc123", "policy_id": "data-access-policy"}}'
```

## How It Works

- **`APortAgentPermission`** — Extracts agent ID from headers or body, verifies via APort SDK.
- **`APortPolicyPermission(policy_id)`** — Verifies agent identity AND checks a specific policy.
- Policy ID can be provided via the permission class constructor or `body.passport.policy_id`.
- `aport_exception_handler` provides consistent error formatting.

## Notes

- The SDK's synchronous methods (`verify_agent_sync`, `verify_policy_sync`) are preferred for DRF views. If only async methods are available, wrap with `asyncio.run()`.
- No database migration needed — this example uses an in-memory SQLite database.
