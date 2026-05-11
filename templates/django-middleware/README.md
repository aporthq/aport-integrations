# APort Django Middleware Template

Scaffolding template for building APort verification into Django applications.

## Quick Start

```bash
cd templates/django-middleware
pip install -e ".[dev]"
```

Add the middleware and APort settings to `settings.py`:

```python
MIDDLEWARE = [
    "aport_django.middleware.APortMiddleware",
    *MIDDLEWARE,
]

APORT_API_KEY = "your_api_key_here"
APORT_PROTECTED_PATHS = {
    "/refunds/": "finance.payment.refund.v1",
    "/admin/actions/": "admin.access",
}
```

Requests matching a protected path must include an agent id in one of these
places:

- `X-Agent-ID` header
- `X-APort-Agent-ID` header
- `agent_id` query parameter
- JSON body field named `agent_id` or `agentId`

On success, the middleware attaches verification data to `request.aport`.

```python
from django.http import JsonResponse


def refund_view(request):
    return JsonResponse({
        "ok": True,
        "agent_id": request.aport["agent_id"],
        "passport": request.aport["passport"],
    })
```

## View Decorator

Use `require_policy` when only a few views need verification.

```python
from django.http import JsonResponse
from aport_django import require_policy


@require_policy("finance.payment.refund.v1")
def refund_view(request):
    return JsonResponse({"ok": True, "agent_id": request.aport["agent_id"]})
```

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `APORT_API_KEY` | `None` | APort API key. |
| `APORT_BASE_URL` | `https://api.aport.io` | APort API base URL. |
| `APORT_DEFAULT_POLICY` | `None` | Optional policy applied to every request. |
| `APORT_PROTECTED_PATHS` | `{}` | Mapping of path prefixes to policy ids. |
| `APORT_STRICT` | `True` | Return `500` on verification errors. If `False`, allow the request and set `request.aport["verified"]` to `False`. |
| `APORT_CLIENT_CLASS` | `aport_django.client.MockAPortClient` | Dotted import path or class for the verification client. |

## Replacing the Mock Client

This template ships with `MockAPortClient` so tests and examples run without
credentials. In production, replace `APORT_CLIENT_CLASS` with an adapter around
the official APort SDK:

```python
APORT_CLIENT_CLASS = "my_project.aport_client.APortSDKClient"
```

The class should expose:

```python
def verify(self, policy: str, agent_id: str, context: dict | None = None):
    ...
```

and return an object with `verified`, `passport`, `message`, and `details`
attributes.

## Example

`examples/django_project` contains a minimal Django project showing both
middleware-based and decorator-based protection.

## Testing

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT
