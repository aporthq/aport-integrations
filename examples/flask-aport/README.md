# Flask + APort Integration Example

A minimal Flask application demonstrating [APort](https://aport.io) agent authentication and policy verification.

## Prerequisites

- Python 3.10+
- An APort API key from [aport.io](https://aport.io)

## Setup

```bash
cd examples/flask-aport
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Configuration

Set required environment variables:

```bash
export APORT_API_KEY=your-api-key-here
# Optional
export APORT_BASE_URL=https://api.aport.io   # default
export APORT_TIMEOUT_MS=5000                   # default
export PORT=5000                               # default
```

## Run

```bash
python app.py
```

## Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | None | Health check |
| `GET /api/agent/info` | Agent ID | Returns verified agent info |
| `GET /api/data/sensitive` | `data-access-policy` | Policy-gated protected data |
| `POST /api/action/write` | `write-permission-policy` | Policy-gated write action |

## Sending Requests

```bash
# Health check (no auth)
curl http://localhost:5000/health

# With agent ID in header
curl -H "X-Agent-Id: agent-abc123" http://localhost:5000/api/agent/info

# With agent ID in body
curl -X POST http://localhost:5000/api/agent/info \
  -H "Content-Type: application/json" \
  -d '{"passport": {"agent_id": "agent-abc123"}}'

# Policy-protected endpoint
curl -X POST http://localhost:5000/api/data/sensitive \
  -H "Content-Type: application/json" \
  -d '{"passport": {"agent_id": "agent-abc123", "policy_id": "data-access-policy"}}'
```
