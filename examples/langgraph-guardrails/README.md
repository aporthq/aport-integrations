# LangGraph Checkpoint Guardrails

APort integration for LangGraph checkpoint verification.

## Installation

```bash
pip install langgraph-aport-guardrails
```

## Quick Start

```python
from langgraph.graph import StateGraph
from langgraph_guardrails import APortCheckpointGuardrail

# Create guardrail
guardrail = APortCheckpointGuardrail(
    api_key="your-api-key",
    project_id="your-project"
)

# Define state
class State(dict):
    pass

# Create graph
workflow = StateGraph(State)

# Add nodes
def process(state):
    return {"result": "processed"}

def execute(state):
    return {"action": "executed"}

workflow.add_node("process", process)
workflow.add_node("execute", execute)

workflow.set_entry_point("process")
workflow.add_edge("process", "execute")

# Compile with guardrail
graph = workflow.compile(
    checkpointer=guardrail,
    interrupt_before=["execute"]
)
```

## How It Works

The guardrail intercepts checkpoint transitions and verifies actions with APort before execution.

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | str | env/APORT_API_KEY | Your APort API key |
| `project_id` | str | "default" | Your project ID |
| `enabled` | bool | True | Enable/disable |
| `exempt_actions` | list | [] | Actions to skip |

## API Reference

### APortCheckpointGuardrail

Main checkpoint saver class.

```python
guardrail = APortCheckpointGuardrail(
    api_key="key",
    project_id="project"
)
```

### create_guardrail_checkpointer

Factory function.

```python
guardrail = create_guardrail_checkpointer(
    api_key="key",
    project_id="project"
)
```

## Example

See `example.py` for a complete state machine example.

## License

MIT
