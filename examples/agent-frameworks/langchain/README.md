# LangChain Tool Guard

This example demonstrates how to create an `APortToolGuard` class that wraps LangChain Tool objects. Before execution, it calls APort `/verify` to check the agent's passport.

## Features

- Wraps any LangChain Tool
- Verifies agent identity and policy compliance before tool execution
- Supports synchronous and asynchronous tool functions
- Raises an exception if verification fails

## Usage

```python
from langchain.tools import Tool
from aport_tool_guard import APortToolGuard

def refund_tool(order_id: str, amount: float) -> str:
    return f"Refunded ${amount} for order {order_id}"

# Initialize APortToolGuard with a LangChain Tool
protected_refund_tool = APortToolGuard(
    tool=Tool(
        name="refund_tool",
        description="Process customer refunds",
        func=refund_tool
    ),
    policy_pack="finance.payment.refund.v1",
    agent_id="agt_inst_xyz789"
)

# Use the protected tool
result = protected_refund_tool("order123", 100.0)
print(result)
```

## Testing

Run tests with:

```bash
pytest test_aport_tool_guard.py
```

## License

MIT
