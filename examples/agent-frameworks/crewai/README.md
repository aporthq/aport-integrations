# APort CrewAI Task Decorator

This integration adds an `@aport_verify` decorator that verifies an APort
agent before a CrewAI task function runs.

It is dependency-light by design:

- Works with normal Python task functions and async task functions
- Accepts any client with a `verify(policy, agent_id, context)` method
- Falls back to a small standard-library HTTP client when no client is provided
- Preserves task metadata with `functools.wraps`
- Raises a clear `APortVerificationError` before task execution when verification is denied

## Installation

```bash
cd examples/agent-frameworks/crewai
pip install -e .
```

CrewAI itself is optional for testing this decorator. Install the optional
extra when using it inside a real CrewAI project:

```bash
pip install -e ".[crewai]"
```

## Basic Usage

```python
from aport_crewai import aport_verify


@aport_verify(
    "finance.payment.refund.v1",
    agent_id="agt_inst_refund_bot_123",
    context=lambda order_id, amount: {
        "order_id": order_id,
        "amount": amount,
        "currency": "USD",
    },
)
def create_refund(order_id: str, amount: float) -> dict:
    return {"order_id": order_id, "amount": amount, "status": "created"}
```

The task body only executes after APort verification succeeds.

## Agent ID Sources

Pass an agent ID directly:

```python
@aport_verify("data.export.v1", agent_id="agt_inst_data_exporter_456")
def export_rows(rows: int) -> int:
    return rows
```

Derive it from task arguments:

```python
@aport_verify(
    "data.export.v1",
    agent_id=lambda agent_id, rows: agent_id,
    context=lambda agent_id, rows: {"rows": rows},
)
def export_rows(agent_id: str, rows: int) -> int:
    return rows
```

Or provide it at runtime with `aport_agent_id`, `agent_id`, or the
`APORT_AGENT_ID` environment variable.

## Client Configuration

By default, the decorator uses `APortHTTPClient`, which reads:

```bash
APORT_API_KEY=your_api_key_here
APORT_BASE_URL=https://api.aport.io
APORT_AGENT_ID=agt_inst_refund_bot_123
```

For tests or custom SDK clients, inject your own client:

```python
class MyAPortClient:
    def verify(self, policy, agent_id, context=None):
        return {"allowed": True}


@aport_verify("admin.access.v1", agent_id="agt_inst_admin_123", client=MyAPortClient())
def admin_task():
    return "allowed"
```

## Async Tasks

```python
@aport_verify("code.repository.merge.v1", agent_id="agt_inst_pr_merger_789")
async def merge_pull_request() -> str:
    return "merged"
```

If the decorated task is async, async verification clients are awaited automatically.

## Error Handling

Verification denial always raises `APortVerificationError` before the task body runs.

```python
from aport_crewai import APortVerificationError

try:
    create_refund("ord_123", 250)
except APortVerificationError as exc:
    print(exc)
```

Set `strict=False` to let the task continue when the APort client itself is
temporarily unavailable. Explicit deny responses still block execution.

## Run the Example

```bash
python examples/basic_usage.py
```

## Tests

```bash
python -m unittest discover -s tests
python -m compileall src tests examples
```
