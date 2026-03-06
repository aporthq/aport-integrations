# LangGraph Checkpoint Guardrails Example

This example integrates APort verification into LangGraph-like state checkpoints to approve/deny transitions.

## Files
- `checkpoint_guard.py`: `LangGraphCheckpointGuard`
- `example.py`: simple transition demo
- `tests/test_checkpoint_guard.py`: allowed/denied test cases

## Usage
```bash
cd examples/langgraph
python3 example.py
```

## API
- `verify_transition(state, next_node, context=None)` -> decision
- `guard(state, next_node, context=None)` -> raises `CheckpointDeniedError` when blocked

## Error handling
Denied transitions raise a clear exception message with reason.

## Scope
Supports LangGraph checkpoint-style transition verification before state advances.
