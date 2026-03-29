# APort n8n Workflow Node

Custom n8n node for APort agent verification in workflows.

## Features

- **Verify**: Verify an agent against a specific APort policy
- **Status**: Check an agent's current verification status
- **List Policies**: List all available APort policies

## Installation

### Community Node (Recommended)

Once published to npm, install via n8n's community node interface:
```
Settings > Community Nodes > Install > n8n-nodes-aport
```

### Manual Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Copy the `dist/` folder to your n8n custom nodes directory

## Configuration

### Create APort API Credentials

1. Go to [aport.io/dashboard](https://aport.io/dashboard) to get your API key
2. In n8n, go to **Settings > Credentials**
3. Create a new **APort API** credential
4. Enter your API key

### Node Operations

#### Verify

Verify an agent against an APort policy.

**Inputs:**
- `Agent ID` (required): The agent identifier to verify
- `Policy` (required): The policy ID to verify against
- `Source` (optional): Source identifier (default: `n8n`)
- `Custom Context` (optional): Additional JSON context

**Outputs:**
```json
{
  "verified": true,
  "passport": {
    "agentId": "agent_123",
    "capabilities": ["read", "write"],
    "limits": { "requests": 1000, "period": "1h" },
    "level": "github_verified"
  },
  "policy": "deploy-policy",
  "message": "Verification successful"
}
```

#### Status

Check an agent's current status.

**Inputs:**
- `Agent ID` (required): The agent identifier to check

#### List Policies

List all available APort policies.

**Inputs:** None

## Example Workflow

```
[Webhook] → [APort Verify] → [IF verified] → [Execute Command]
                              ↓
                         [IF not verified] → [Notify Slack]
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## Requirements

- Node.js 18+
- n8n 1.0+
- APort account (free at [aport.io](https://aport.io))

## License

MIT
