# APort Django Middleware

Django middleware for [The Passport for AI Agents](https://aport.io) — verification and policy enforcement.

## Installation

```bash
pip install aporthq-middleware-django
```

## Quick Start

### 1. Add middleware to `settings.py`

```python
MIDDLEWARE = [
    # ...
    'aporthq_middleware_django.AgentPassportMiddleware',
]

APORT_OPTIONS = {
    'policy_id': 'finance.payment.refund.v1',
    'fail_closed': True,
}
```

### 2. Use in views

```python
from aporthq_middleware_django import require_policy, require_agent
from django.http import JsonResponse
import json

@require_policy("finance.payment.refund.v1")
def process_refund(request):
    body = json.loads(request.body)
    return JsonResponse({
        "success": True,
        "agent_id": request.agent["agent_id"],
    })

@require_agent
def dashboard(request):
    return JsonResponse({
        "agent_id": request.agent["agent_id"],
    })
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `base_url` | `str` | `https://api.aport.io` | APort API base URL |
| `api_key` | `str` | `None` | API key (or `AGENT_PASSPORT_API_KEY` env) |
| `timeout_ms` | `int` | `5000` | Request timeout |
| `fail_closed` | `bool` | `True` | Reject requests when verification fails |
| `policy_id` | `str` | `None` | Global policy to enforce |
| `skip_paths` | `list` | `["/health", "/metrics", "/status"]` | Paths to skip |
| `passport_from_body` | `bool` | `True` | Extract agent_id from request body |
| `policy_from_body` | `bool` | `True` | Extract policy_id from request body |

## Agent ID Resolution

1. `@require_policy(agent_id="...")` explicit parameter
2. `X-Agent-Passport-Id` header
3. `X-Agent-Id` header (fallback)
4. `request.body.passport.agent_id` (POST with JSON)
5. Fail with 401

## Available Policies

| Policy ID | Description |
|-----------|-------------|
| `finance.payment.refund.v1` | Refund processing |
| `data.export.create.v1` | Data export |
| `messaging.message.send.v1` | Message sending |
| `code.repository.merge.v1` | Code merge |

## Error Responses

**401 — Missing agent ID**
```json
{"error": "missing_agent_id", "message": "Agent ID is required..."}
```

**403 — Policy violation**
```json
{"error": "policy_violation", "message": "Policy violation", "agent_id": "...", "policy_id": "..."}
```

## License

MIT
