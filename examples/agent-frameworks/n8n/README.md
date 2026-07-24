# APort n8n Node

Custom n8n node for APort agent verification.

## Installation

1. Copy the `aport-n8n-node.js` file into your n8n custom nodes directory.

2. Install dependencies:

```bash
npm install chalk axios
```

3. Restart n8n.

## Usage

- The node verifies an agent against a specified APort policy pack.
- Provide the Agent ID, Policy Pack, optional JSON context, and optionally an API key.
- The node outputs the verification result or error.

## Example

Use the node in your workflow to verify agents before proceeding with actions.

## Development

- The node uses the official APort CLI client internally.
- Errors in JSON context parsing or API calls are handled gracefully.

## License

MIT
