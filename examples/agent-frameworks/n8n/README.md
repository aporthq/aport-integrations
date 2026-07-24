# APort n8n Workflow Node

This custom n8n node allows you to verify an agent against an APort policy pack within your n8n workflows. It supports configuration of agent ID, policy pack, context, and API credentials.

## Features

- Verify agents against APort policies
- Supports additional context as JSON
- Handles API key authentication (optional)
- Returns full verification response for workflow use

## Installation

1. Copy the `aport-n8n-node.js` file into your n8n custom nodes directory.
2. Restart n8n to load the new node.
3. Use the "APort Verify" node in your workflows.

## Usage

- **Agent ID**: The agent identifier to verify.
- **Policy Pack**: The policy pack to verify against (e.g., `finance.payment.refund.v1`).
- **Context (JSON)**: Optional JSON string with additional context.
- **API Base URL**: Base URL for the APort API (default: `https://aport.io`).
- **API Key**: Optional API key for authenticated requests.

## Example Workflow

1. Add the "APort Verify" node.
2. Configure the node with agent ID, policy, and context.
3. Connect the node to subsequent nodes to handle verification results.

## Error Handling

- Invalid JSON in context will cause the node to error.
- API errors will be reported with detailed messages.

## License

MIT
