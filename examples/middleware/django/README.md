# APort Django Middleware

Package-ready Django integration for verifying APort agent policies before protected
views run.

## Features

- Django middleware for route-level APort verification
- `@aport_required(...)` decorator for view-level policy checks
- Header, query string, form body, and JSON body agent ID extraction
- Strict fail-closed mode by default, with opt-in fail-open mode for degraded service
- Sync adapter for `aporthq-sdk-python`
- Unit tests and a runnable Django example project

## Installation

After this package is published to PyPI:

```bash
pip install aport-middleware-django
```

For local development from this repository:

```bash
cd examples/middleware/django
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Django Settings

Add the app and middleware:

```python
INSTALLED_APPS = [
    # ...
    "aport_django",
]

MIDDLEWARE = [
    # ...
    "aport_django.middleware.APortVerificationMiddleware",
]
```

Configure APort and the routes you want to protect:

```python
APORT_API_KEY = "your-aport-api-key"
APORT_BASE_URL = "https://api.aport.io"
APORT_TIMEOUT_MS = 800
APORT_STRICT = True

APORT_POLICIES = [
    {
        "path": "/payments/refund/",
        "methods": ["POST"],
        "policy": "finance.payment.refund.v1",
        "context": {"risk": "high"},
    },
]
```

Requests matching `/payments/refund/` must include an agent ID in one of these
locations:

- `X-Agent-ID` header
- `X-APort-Agent-ID` header
- `agent_id` or `agentId` query parameter
- `agent_id` or `agentId` form field
- `agent_id` or `agentId` JSON body field

When verification succeeds, the middleware attaches `request.aport`:

```python
{
    "verified": True,
    "agent_id": "agent_123",
    "policy": "finance.payment.refund.v1",
    "passport": {...},
    "raw": {...},
}
```

Failed or missing verification returns JSON with:

- `400` and `aport_agent_required` when no agent ID is present
- `403` and `aport_verification_failed` when APort denies the policy
- `503` and `aport_verification_error` when verification cannot complete in strict mode

## Decorator Usage

Use `@aport_required` when only a single view needs a policy check:

```python
from django.http import JsonResponse
from aport_django.decorators import aport_required


@aport_required("finance.payment.refund.v1", context={"risk": "high"})
def refund_payment(request):
    return JsonResponse({"ok": True, "aport": request.aport})
```

## Testing With a Custom Verifier

Tests and local sandboxes can inject a custom verifier without calling the APort
API:

```python
class FakeVerifier:
    def verify(self, *, agent_id, policy, context=None, request=None):
        return {
            "verified": True,
            "passport": {"agent_id": agent_id, "scope": policy},
        }


APORT_CLIENT = FakeVerifier()
```

You can also provide a function:

```python
def verify_aport_policy(*, agent_id, policy, context=None, request=None):
    return {"verified": agent_id.startswith("agent_")}


APORT_VERIFY_FUNC = verify_aport_policy
```

## Example Project

The sample project under `examples/django_project` includes a protected refund
endpoint and an unprotected health check.

```bash
cd examples/middleware/django
. .venv/bin/activate
python examples/django_project/manage.py runserver 8000
```

Try the protected endpoint:

```bash
curl -X POST http://127.0.0.1:8000/payments/refund/ \
  -H "X-Agent-ID: agent_demo" \
  -H "Content-Type: application/json" \
  -d '{"amount":"25.00","currency":"USD"}'
```

Set `APORT_API_KEY` and `APORT_BASE_URL` in your environment to use the real APort
API. Without a custom verifier, the middleware uses `aporthq-sdk-python`.
