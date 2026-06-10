# APort CrewAI Task Verification Decorator

This example adds an `@aport_verify` decorator that verifies a CrewAI task with APort before the task executes.

The decorator protects synchronous functions, bound methods, and asynchronous task callables, which covers common CrewAI task patterns.

## Install

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e ".[test]"
```

Optional CrewAI runtime:

```bash
pip install -e ".[crewai]"
```

Optional APort SDK package:

```bash
pip install -e ".[sdk]"
```

## Configure

```bash
export APORT_API_KEY=your_api_key_here
export APORT_API_URL=https://aport.io/api/verify
```

## Usage

```python
from aport_crewai import aport_verify


@aport_verify(
    "finance.payment.refund.v1",
    task_type="refund_approval",
    context=lambda order_id, amount: {"order_id": order_id, "amount": amount},
)
def approve_refund(order_id: str, amount: float) -> str:
    return f"Refund approved for {order_id}: ${amount:.2f}"
```

If APort denies the request, the decorator raises `APortVerificationError` before the task body runs.

## Example Task Types

- `refund_approval` for finance workflows.
- `data_export` for customer data exports.
- `repo_merge` for repository operations.
- `generic` for custom CrewAI tasks.

## Test

```bash
pip install -e ".[test]"
pytest
```
