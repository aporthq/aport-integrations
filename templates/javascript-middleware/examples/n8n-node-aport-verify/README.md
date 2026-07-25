# Custom n8n Node for APort Verification

This is a custom n8n node that verifies an agent against an APort policy pack using the official APort Node.js SDK.

## Features

- Verify agent identity and policy compliance in n8n workflows
- Configurable agent ID, policy pack, context, API key, and base URL
- Returns full verification result in output data
- Supports multiple input items

## Installation

1. Copy the `n8n-node-aport-verify.js` file into your n8n custom nodes directory.

2. Install the official APort SDK in your n8n environment:

```bash
npm install @aporthq/sdk-node
```

3. Restart n8n to load the new node.

## Usage

- Add the "APort Verify" node to your workflow.
- Configure the node parameters:
  - **Agent ID**: The agent identifier to verify.
  - **Policy Pack**: The policy pack to verify against (default: `finance.payment.refund.v1`).
  - **Context**: Optional JSON context for verification.
  - **API Key**: Your APort API key (or set via environment variable `APORT_API_KEY`).
  - **Base URL**: APort API base URL (default: `https://api.aport.io`).

## Example Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "agentId": "agt_inst_refund_bot_123",
        "policy": "finance.payment.refund.v1",
        "context": {
          "amount": 50,
          "currency": "USD"
        },
        "apiKey": ""
      },
      "name": "APort Verify",
      "type": "aportVerify",
      "typeVersion": 1,
      "position": [400, 300]
    }
  ],
  "connections": {}
}
```

## Error Handling

- If verification fails, the node will throw an error unless "Continue On Fail" is enabled.
- In "Continue On Fail" mode, errors are returned in the output JSON.

## License

MIT
