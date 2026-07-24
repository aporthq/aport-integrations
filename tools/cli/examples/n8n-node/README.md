# n8n APort Policy Check Node

This is a custom n8n node that verifies an agent against an APort policy pack.

## Features

- Verify agent identity and capabilities using APort API
- Supports custom policy packs and context
- Handles errors and invalid input gracefully

## Installation

1. Copy the `n8n-aport-policy-check` folder into your n8n custom nodes directory.
2. Run `npm install` inside the node directory to install dependencies.
3. Restart n8n to load the new node.

## Usage

- Add the "APort Policy Check" node to your workflow.
- Provide the Agent ID, Policy Pack, and optional JSON context.
- Optionally provide an API key or set `APORT_API_KEY` in your environment.
- Connect the node to your workflow and run.

## Example

```json
{
  "agentId": "agt_inst_xyz789",
  "policy": "finance.payment.refund.v1",
  "context": "{\"amount\": 100}"
}
```

## Development

- Run tests with `npm test`.
- Follow the repository coding standards.

## License

MIT
