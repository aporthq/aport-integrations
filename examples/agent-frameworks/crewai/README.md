# CrewAI APort Verify Decorator Example

This example adds an `@aport_verify` decorator for CrewAI task functions to enforce APort policy verification before execution.

## What it includes
- `aport_verify.py`: decorator + verifier adapter
- `example.py`: runnable usage sample
- `tests/test_aport_verify.py`: sync/async tests + deny-path test

## How it works
1. Build or inject a verifier callable (e.g. `aporthq-sdk-python` verify API)
2. Wrap task functions with `@aport_verify(...)`
3. On each invocation:
   - resolve actor/context
   - call verifier
   - block execution with `APortVerificationError` when denied

## Run example
```bash
cd examples/agent-frameworks/crewai
python3 example.py
```

## Run tests
```bash
cd examples/agent-frameworks/crewai
python3 -m pip install pytest pytest-asyncio
PYTHONPATH=. pytest -q
```

## Error handling
Denied requests raise `APortVerificationError` with verifier reason when provided.

## Supported task types
Decorator supports plain sync and async Python callables used in CrewAI task pipelines.
