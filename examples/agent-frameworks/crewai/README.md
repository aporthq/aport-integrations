# CrewAI APort Task Verification

APort verification decorator for CrewAI task functions — every task
execution is gated by an APort policy check before the task logic runs.

## What

`@aport_verify` wraps CrewAI task functions so that before a task executes,
the agent's APort passport is verified against a configurable policy pack.
If the agent doesn't satisfy the policy, the task is denied with a clear error.

## Install

```bash
pip install crewai  # or just include src/ in your PYTHONPATH
```

No extra dependencies — the decorator uses only the standard library
(`urllib.request`) for APort API calls.

## Quick Start

```python
from src import aport_verify

@aport_verify("code.repository.merge.v1")
def merge_code(repo: str, branch: str) -> str:
    return f"Merged {branch} into {repo}"
```

## Key Features

- **Works with sync and async task functions**
- **Configurable agent ID resolution**: static string → kwarg → env var
- **Fail-open / fail-closed modes** via `strict=True/False`
- **Context injection** via `context_builder` callback
- **Dependency-free** APort client (no external SDK required)

## API Reference

### `@aport_verify(policy, *, agent_id=None, client=None, strict=True, context_builder=None)`

| Argument | Type | Description |
|---|---|---|
| `policy` | `str` | APort policy pack name (required) |
| `agent_id` | `str` | Static agent ID (or resolved from kwarg/env) |
| `client` | `APortHTTPClient` | HTTP client instance (uses default if None) |
| `strict` | `bool` | If `True`, raises on denial. If `False`, just logs and proceeds. |
| `context_builder` | `callable` | Receives same args as the function; return value is sent as verification context |

### Agent ID Resolution (in priority order)

1. Static `agent_id=` kwarg to the decorator
2. `agent_id` kwarg passed to the function at call time
3. `APORT_AGENT_ID` environment variable
4. Raises `APortVerificationError` if none found

## Usage Examples

### Basic usage

```python
from src import aport_verify

@aport_verify("finance.payment.refund.v1")
def process_refund(amount: float, agent_id: str = None) -> str:
    return f"Refunded ${amount}"
```

### With static agent ID

```python
@aport_verify("data.export.v1", agent_id="agent_export_001")
def export_data(format: str) -> str:
    return f"Exported data as {format}"
```

### With context injection

```python
@aport_verify(
    "finance.payment.refund.v1",
    context_builder=lambda amount, **kw: {"amount": amount}
)
def refund_item(amount: float, item: str) -> str:
    return f"Refunded {item} for ${amount}"
```

### Non-strict mode (denial doesn't block execution)

```python
@aport_verify("monitoring.alert.send", strict=False)
def send_alert(message: str) -> str:
    return f"Alert: {message}"
```

### Async task

```python
from src import aport_verify

@aport_verify("code.repository.merge.v1")
async def async_merge(repo: str, branch: str) -> str:
    return f"Merged {branch}"
```

## Development

```bash
# Run tests
PYTHONPATH=src python3 -m unittest discover -s tests

# Syntax check
python3 -m compileall src tests examples

# Run example
PYTHONPATH=src python3 examples/basic_usage.py
```