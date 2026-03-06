# LangChain APort Tool Guard Example

This example provides an `APortToolGuard` that wraps LangChain-compatible tool callables and verifies policy before execution.

## Files
- `aport_tool_guard.py`: core guard implementation
- `example.py`: usage sample with a protected tool
- `tests/test_aport_tool_guard.py`: allow/deny tests

## How to use
```python
from aport_tool_guard import APortToolGuard

guard = APortToolGuard(
    verify_callable,
    actor_id_getter=lambda *a, **k: k["actor_id"],
    resource_getter=lambda *a, **k: "langchain:tool:weather",
)

safe_tool = guard.wrap(tool_callable)
```

## Run example
```bash
cd examples/langchain
python3 example.py
```

## Run tests
```bash
cd examples/langchain
PYTHONPATH=. pytest -q
```

## Error handling
Denied verification raises `APortToolGuardError`.

## Tool types supported
Supports any Python callable used as LangChain-style tool handlers.
