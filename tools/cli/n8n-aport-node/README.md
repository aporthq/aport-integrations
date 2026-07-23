# Custom n8n Node for APort Verification

This custom n8n node allows you to verify an agent's passport using the APort API within your n8n workflows.

## Features

- Verify an agent against a specified policy pack
- Pass additional context as JSON
- Handle verification success and failure with detailed reasons
- Easy to configure and use in n8n

## Installation

1. Copy the `n8n-aport-node` directory into your n8n custom nodes folder.
2. Restart n8n.
3. The node will be available as "APort Verify" in your node list.

## Usage

- **Agent ID**: The agent's passport ID to verify.
- **Policy Pack**: The policy pack identifier to verify against.
- **Context**: Optional JSON string with additional context.

## Example

Use this node to verify an agent before proceeding with sensitive workflow steps, such as refunds or data exports.

## Development

This node uses the official `@aporthq/sdk-node` package to communicate with the APort API.

## License

MIT
