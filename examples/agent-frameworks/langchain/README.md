# LangChain APort Tool Guard

APort verification for LangChain tools — every tool invocation is gated
by an APort policy check **before** the tool executes.

## What

`APortToolGuard` wraps any LangChain `BaseTool` (including `@tool` decorators,
`StructuredTool`, and classic `Tool`) to require APort agent verification
before the tool's logic runs.

## Install

```bash
pip install langchain langchain-core
```

No additional dependencies — the guard uses a mock client while the
`aporthq-sdk-python` package is being finalized.

## Quick Start

```python
from langchain_core.tools import tool
from tool_guard import APortToolGuard, guard_tool

# Define a tool normally
@tool
def issue_refund(transaction_id: str, amount: float) -> str:
    """Issue a refund."""
    return f"Refund ${amount:.2f} for {transaction_id}"

# Wrap it with a policy guard
guarded_refund = guard_tool(
    tool=issue_refund,
    policy="finance.payment.refund.v1",
    agent_id="agt_my_agent",
)

# Execution automatically verifies the agent first
result = guarded_refund.invoke({
    "transaction_id": "txn_abc",
    "amount": 49.99,
})
print(result)  # Refund $49.99 for txn_abc
```

## Agent ID Resolution

The agent ID is resolved in this priority order:
1. `RunnableConfig.metadata["aport_agent_id"]` (per-call override)
2. `APORT_AGENT_ID` environment variable
3. Instance `agent_id` attribute

## Tool Types Supported

| Type | Support |
|------|---------|
| `@tool` decorated function | ✅ |
| `StructuredTool` with Pydantic schema | ✅ |
| Classic `Tool(func=...)` | ✅ |
| Any `BaseTool` subclass | ✅ |

## Policies

Guard different tools with different policies:

```python
guarded_refund = guard_tool(refund, "finance.payment.refund.v1")
guarded_export = guard_tool(export, "privacy.data.export.v1")
guarded_search = guard_tool(search, "search.query.v1")

# Public tools don't need guarding at all
public_tool = get_customer_email  # no guard
```

## Fail-Open Mode

If you want tools to execute even when the APort API is unreachable:

```python
guarded = guard_tool(
    my_tool,
    "critical.operation.v1",
    fail_open=True,  # allow on API error
)
```

Default is `fail_open=False` — API errors block tool execution.

## Run Example

```bash
python example.py
```

## Run Tests

```bash
pip install pytest pydantic langchain-core
pytest test_tool_guard.py -v
```

## Directory

```
examples/agent-frameworks/langchain/
├── tool_guard.py      # APortToolGuard implementation
├── example.py         # Working demo agent
├── test_tool_guard.py # Comprehensive tests
└── README.md          # This file
```
