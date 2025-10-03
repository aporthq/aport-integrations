# LangGraph APort Integration

A comprehensive integration that adds APort agent verification to LangGraph state machine checkpoints, enabling secure and policy-driven state transitions in AI agent workflows.

## Overview

This integration allows you to protect LangGraph state machines with APort's agent identity verification system. It provides checkpoint-level security where each state transition can be verified against policies before execution.

### Key Features

- **Checkpoint Protection**: Verify agent permissions before state transitions
- **Policy-Based Control**: Different policies for different workflow stages
- **Real-time Verification**: Sub-100ms verification checks
- **Error Handling**: Graceful degradation and fallback strategies
- **Audit Trail**: Comprehensive logging of verification events
- **Retry Logic**: Built-in retry mechanisms for transient failures

## Quick Start

### Prerequisites

- Python 3.8+
- LangGraph 0.2.0+
- APort account and API key

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your APort credentials
```

### Basic Usage

```python
from langgraph_aport import APortCheckpointGuard
from langgraph.graph import StateGraph

# Initialize the guard
guard = APortCheckpointGuard(
    api_key="your_aport_api_key",
    default_policy="workflow.basic.v1"
)

# Create a protected node
@guard.require_verification(policy="data.process.v1")
async def process_data(state, config=None):
    # Your node logic here
    return {"processed": True}

# Create your workflow
workflow = StateGraph(YourStateSchema)
workflow.add_node("process", process_data)
workflow.set_entry_point("process")

# Compile and run
app = workflow.compile()
result = await app.ainvoke({"agent_id": "agt_user_123", "data": "..."})
```

## API Reference

### APortCheckpointGuard

Main class for adding APort verification to LangGraph workflows.

#### Constructor

```python
guard = APortCheckpointGuard(
    api_key: Optional[str] = None,           # APort API key
    base_url: Optional[str] = None,          # APort API base URL
    default_policy: str = "workflow.transition.v1",  # Default verification policy
    strict_mode: bool = True,                # Whether to fail on verification errors
    use_mock: bool = True                    # Use mock client for development
)
```

#### Methods

##### `require_verification(policy=None, agent_id_extractor=None)`

Decorator to add verification to node functions.

```python
@guard.require_verification(
    policy="custom.policy.v1",
    agent_id_extractor=lambda state: state.get("user_id")
)
async def my_node(state, config=None):
    return {"result": "processed"}
```

##### `protect_graph(graph, agent_id_extractor=None, checkpoint_policies=None)`

Protect an entire StateGraph with verification.

```python
protected_graph = guard.protect_graph(
    graph=my_graph,
    agent_id_extractor=extract_agent_id,
    checkpoint_policies={
        "sensitive_node": "high_security.policy.v1",
        "normal_node": "standard.policy.v1"
    }
)
```

##### `verify_transition(agent_id, from_state, to_state, state_data, policy=None)`

Manually verify a state transition.

```python
result = await guard.verify_transition(
    agent_id="agt_user_123",
    from_state="initial",
    to_state="processing",
    state_data={"key": "value"},
    policy="transition.policy.v1"
)
```

### APortClient

Low-level client for APort API interactions.

#### Constructor

```python
client = APortClient(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: int = 5000,
    use_mock: bool = True
)
```

#### Methods

##### `verify_checkpoint(policy, agent_id, checkpoint_id, state, context=None)`

Verify agent authorization for a checkpoint.

```python
result = await client.verify_checkpoint(
    policy="data.access.v1",
    agent_id="agt_user_123",
    checkpoint_id="checkpoint_001",
    state={"data": "sensitive"},
    context={"operation": "read"}
)
```

## Configuration

### Environment Variables

```bash
# Required
APORT_API_KEY=your_aport_api_key_here

# Optional
APORT_BASE_URL=https://api.aport.io
AGENT_ID=agt_default_agent
DEFAULT_POLICY=workflow.transition.v1
STRICT_MODE=true
VERIFICATION_TIMEOUT=5000
LOG_LEVEL=INFO
```

### Policy Configuration

Define verification rules for different states:

```python
guard.add_verification_rule(
    state_name="sensitive_operation",
    policy="high_security.policy.v1",
    required_capabilities=["admin", "sensitive_data"],
    context_extractor=lambda state: {
        "data_classification": state.get("classification"),
        "user_role": state.get("user_role")
    }
)
```

## Architecture

### Component Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   LangGraph     │    │ APortCheckpoint  │    │   APort API     │
│   Workflow      │◄──►│     Guard        │◄──►│   Service       │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  State Machine  │    │  Verification    │    │  Policy Engine  │
│   Execution     │    │     Logic        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Verification Flow

1. **Node Execution**: LangGraph attempts to execute a protected node
2. **Agent Extraction**: Guard extracts agent ID from state
3. **Policy Resolution**: Determines which policy to apply
4. **APort Verification**: Calls APort API to verify agent permissions
5. **Decision**: Allow/deny execution based on verification result
6. **Execution/Fallback**: Execute node or apply fallback strategy

## Workflow Patterns

### Basic State Machine

See [`workflows/basic_workflow.py`](workflows/basic_workflow.py) for a simple workflow with APort verification.

```bash
python workflows/basic_workflow.py
```

### Advanced Workflow

See [`workflows/multi_stage_workflow.py`](workflows/multi_stage_workflow.py) for a multi-stage workflow with different verification policies.

```bash
python workflows/multi_stage_workflow.py
```

### Error Handling

See [`workflows/error_handling.py`](workflows/error_handling.py) for error handling and recovery strategies.

```bash
python workflows/error_handling.py
```

## Testing

Run the comprehensive test suite:

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-mock

# Run all tests
pytest tests/ -v

# Run specific test categories
pytest tests/test_checkpoint_guard.py -v
pytest tests/test_client.py -v
pytest tests/test_integration.py -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

### Test Categories

- **Unit Tests**: Test individual components (`test_client.py`, `test_checkpoint_guard.py`)
- **Integration Tests**: Test real-world scenarios (`test_integration.py`)
- **Mock Tests**: Validate mock behavior and development setup
- **Error Handling Tests**: Verify graceful failure modes
- **Performance Tests**: Test concurrent operations and scaling

## Error Handling

### Strict Mode vs. Graceful Degradation

```python
# Strict mode - fails on verification errors
strict_guard = APortCheckpointGuard(strict_mode=True)

# Graceful mode - continues with limited functionality
graceful_guard = APortCheckpointGuard(strict_mode=False)

@graceful_guard.require_verification()
async def resilient_node(state, config=None):
    if state.get("_aport_verification_error"):
        # Fallback logic
        return {"result": "limited_operation"}
    return {"result": "full_operation"}
```

### Custom Error Handling

```python
from langgraph_aport.exceptions import VerificationError, CheckpointError

try:
    result = await guard.verify_transition(...)
except VerificationError as e:
    logger.warning(f"Verification failed: {e}")
    # Handle verification failure
except CheckpointError as e:
    logger.error(f"Checkpoint error: {e}")
    # Handle checkpoint system error
```

## Best Practices

### 1. Agent ID Extraction

Always provide clear agent ID extraction strategies:

```python
def extract_agent_id(state):
    # Try multiple fields with fallbacks
    return (
        state.get("agent_id") or 
        state.get("user_id") or 
        state.get("session_id") or
        "anonymous_agent"
    )
```

### 2. Policy Naming

Use hierarchical policy naming:

```python
"workflow.customer_service.view.v1"      # View customer data
"workflow.customer_service.update.v1"    # Update customer data  
"workflow.customer_service.refund.v1"    # Process refunds
"system.admin.user_management.v1"        # Admin operations
```

### 3. Context Enrichment

Provide rich context for verification:

```python
context = {
    "operation": "data_export",
    "data_classification": "sensitive",
    "user_role": state.get("user_role"),
    "request_source": "api",
    "timestamp": datetime.utcnow().isoformat()
}
```

### 4. Monitoring and Logging

Implement comprehensive logging:

```python
import logging

logger = logging.getLogger(__name__)

# Log verification events
logger.info(f"Verification successful for {agent_id} on {policy}")
logger.warning(f"Verification failed for {agent_id}: {error}")
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/aport-integrations.git
cd aport-integrations/examples/agent-frameworks/langgraph

# Install development dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-mock black isort

# Run pre-commit checks
black src/ tests/
isort src/ tests/
pytest tests/ -v
```

## License

This project is licensed under the MIT License - see the [LICENSE](../../../../LICENSE) file for details.

## Support

- **Documentation**: [APort Documentation](https://aport.io/docs)
- **Issues**: [GitHub Issues](https://github.com/aporthq/aport-integrations/issues)
- **Discord**: [APort Community](https://discord.gg/aport)
- **Email**: [support@aport.io](mailto:support@aport.io)

## Acknowledgments

- LangGraph team for the excellent state machine framework
- APort team for the verification infrastructure
- Contributors and community members

---

**Built with care for the APort ecosystem**