# CrewAI Task Verification Decorator

APort decorator for CrewAI task verification.

## What It Does

- Verifies CrewAI tasks with APort before execution
- Blocks suspicious task executions
- Integrates with CrewAI workflow

## Installation

```bash
pip install aport-crewai
```

## Quick Start

```python
from aport_crewai import aport_verify

@aport_verify("research_task")
def my_task(context):
    return {"result": "done"}
```

## Usage

### Basic Usage

```python
from aport_crewai import aport_verify

@aport_verify("execute_task")
def my_task(context):
    # Task logic
    return result
```

### With Context

```python
from aport_crewai import aport_verify

@aport_verify(
    action="process_data",
    context_builder=lambda ctx: {"input": ctx.get("input")}
)
def process_data(data):
    return processed_data
```

### Custom Client

```python
from aport_crewai import AportVerify, set_client

client = AportVerify(api_key="your-key", project_id="your-project")
set_client(client)
```

## API Reference

### aport_verify

Decorator for task verification.

```python
@aport_verify(
    action="task_name",
    actor_id_from_context=lambda ctx: ctx.get("user_id"),
    context_builder=lambda ctx: {"data": ctx.get("data")}
)
def my_task(context):
    pass
```

### AportVerify

Client class.

```python
client = AportVerify(api_key="key", project_id="project")
```

## Example with CrewAI

```python
from crewai import Agent, Task, Crew
from aport_crewai import aport_verify

@aport_verify("research")
def research_task(agent, context):
    return agent.execute_task(context)

crew = Crew(
    agents=[research_agent],
    tasks=[research_task]
)

result = crew.kickoff()
```

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| api_key | str | env/APORT_API_KEY | Your API key |
| project_id | str | "default" | Your project ID |
| enabled | bool | True | Enable verification |

## License

MIT
