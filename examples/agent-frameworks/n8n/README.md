# n8n APort Verification Node

This example demonstrates a custom n8n workflow node that performs APort policy verification.

## Features

- Custom n8n node to verify an agent against an APort policy pack
- Configurable policy pack and agent ID inputs
- Handles verification response and routes workflow accordingly
- Includes error handling and validation

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the node:

```bash
npm run build
```

3. Link the node to your n8n instance or copy the built files to your n8n custom nodes directory.

4. Use the node in your workflows by providing the agent ID and policy pack.

## Usage

- The node accepts parameters:
  - `agentId`: The agent ID to verify
  - `policyPack`: The policy pack identifier to verify against
  - `context`: Optional JSON string with additional context

- The node outputs:
  - `verified`: Boolean indicating if verification passed
  - `passport`: The agent's passport data if verified
  - `message`: Verification message or error

## Development

- Source code is in `src/`
- Tests are in `tests/`
- Build with `npm run build`
- Test with `npm test`

## License

MIT
