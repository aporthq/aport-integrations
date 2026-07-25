# APort n8n Custom Node

This directory contains a custom n8n node for verifying agents against APort policies.

## Features

- Verify an agent ID against a specified APort policy pack
- Provide additional context for verification
- Supports API key configuration
- Returns verification result or error

## Installation

1. Copy the `aport-n8n-node.js` file into your n8n custom nodes directory.

2. Install the official APort Node.js SDK in your n8n environment:

```bash
npm install @aporthq/sdk-node
```

3. Restart n8n to load the new node.

## Usage

- Add the "APort Verify" node to your workflow.
- Configure the policy pack, agent ID, and optional context.
- Optionally provide an API key or set `APORT_API_KEY` in your environment.
- Connect the node to your workflow to perform verification.

## Example Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "policy": "finance.payment.refund.v1",
        "agentId": "agt_inst_xyz789",
        "context": {}
      },
      "name": "APort Verify",
      "type": "aportVerify",
      "typeVersion": 1,
      "position": [250, 300]
    }
  ],
  "connections": {}
}
```

## Development

- The node is implemented in `aport-n8n-node.js`.
- Uses the official `@aporthq/sdk-node` package.
- Handles errors gracefully and returns success status.

## License

MIT
