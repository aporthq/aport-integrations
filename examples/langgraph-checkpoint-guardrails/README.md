# APort LangGraph Checkpoint Guardrails

Integrate APort verification into LangGraph state machine checkpoints to approve/deny state transitions.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- LangGraph >= 0.2.0
- APort account ([sign up](https://aport.io/dashboard))

### Installation

```bash
pip install -e ".[dev]"
```

### Usage

**Option A — Declarative guarded graph:**

```python
import asyncio
from aport_langgraph_guardrails import create_guarded_graph

async def intake(state):
    return {"messages": ["intake: received request"]}

async def review(state):
    return {"messages": state["messages"] + ["review: approved"]}

graph = create_guarded_graph(
    policy="agent.workflow.v1",
    nodes={"intake": intake, "review": review},
    edges=[("intake", "review")],
    entry_point="intake",
)

result = await graph.ainvoke({"agent_id": "agt_001", "messages": []})
print(result)
```

**Option B — Manual guard on individual nodes and edges:**

```python
from aport_langgraph_guardrails import APortCheckpointGuard, APortState
from langgraph.graph import StateGraph, END

guard = APortCheckpointGuard(policy="agent.custom.v1")

async def my_node(state: APortState) -> dict:
    return {"messages": ["done"]}

builder = StateGraph(APortState)
builder.add_node("my_node", guard.guard_node("my_node", my_node))
builder.set_entry_point("my_node")
builder.add_edge("my_node", END)

graph = builder.compile()
```

## 📚 API Reference

### `APortCheckpointGuard(policy, api_key=None, base_url=None, strict=True)`

| Parameter | Description |
|-----------|-------------|
| `policy` | APort policy pack identifier |
| `api_key` | API key (falls back to `APORT_API_KEY` env) |
| `strict` | Block transitions on failure when `True` |

### Key Methods

- **`guard_node(name, fn)`** — Wrap a node function with APort verification.
- **`create_guarded_edge(source, target)`** — Create a guarded edge that blocks unauthorized transitions.
- **`verify_transition(source, target, state)`** — Manually verify a proposed transition.

### `create_guarded_graph(policy, nodes, edges, entry_point, api_key, strict)`

Convenience function that builds a full compiled `StateGraph` with all nodes and edges guarded.

## 🧪 Testing

```bash
pytest tests/
```

## 📄 License

MIT
