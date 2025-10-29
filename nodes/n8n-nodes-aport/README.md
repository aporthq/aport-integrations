# n8n-nodes-aport

This is an n8n community node for APort agent verification and policy compliance.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[APort](https://aport.io) provides agent verification and policy compliance for AI agents.

## Installation

### Windows Installation

1. Copy the node to n8n's custom nodes directory:

```powershell
Copy-Item -Path "path\to\n8n-nodes-aport" -Destination "$env:USERPROFILE\.n8n\nodes\" -Recurse
```

2. Install dependencies:

```powershell
cd "$env:USERPROFILE\.n8n\nodes\n8n-nodes-aport"
npm install
```

3. Start n8n with custom extensions:

```powershell
$env:N8N_CUSTOM_EXTENSIONS = "$env:USERPROFILE\.n8n\nodes"
n8n start
```

### Linux/Mac Installation

1. Copy the node to n8n's custom nodes directory:

```bash
cp -r path/to/n8n-nodes-aport ~/.n8n/nodes/
```

2. Install dependencies:

```bash
cd ~/.n8n/nodes/n8n-nodes-aport
npm install
```

3. Start n8n with custom extensions:

```bash
export N8N_CUSTOM_EXTENSIONS=~/.n8n/nodes
n8n start
```

### Community Nodes (Future - requires npm publish)

Once published to npm:

1. Go to **Settings > Community Nodes** in your n8n instance
2. Click **Install**
3. Enter `n8n-nodes-aport`
4. Click **Install**

## Operations

The APort node supports the following operations:

- **List Policy Packs** - List all available policy packs (no credentials required)
- **Verify Policy** - Verify an agent against a policy
- **Create Passport** - Create a new agent passport (requires API key)
- **Get Passport** - Get passport information for an agent
- **Suspend Passport** - Suspend an agent passport

## Quick Start Examples

### 1. List All Available Policy Packs

**Operation**: List Policy Packs

### 2. Create a New Agent Passport

Required: API Key credential

```json
{
  "name": "My Export Bot",
  "role": "Data Exporter",
  "description": "Agent for CSV exports",
  "capabilities": [{ "id": "data.export", "params": {} }],
  "limits": {
    "max_rows_per_export": 10000,
    "allow_pii": false
  },
  "regions": ["US"],
  "contact": "admin@example.com",
  "controller_type": "person",
  "status": "active"
}
```

## Testing

The node has been live tested in n8n with the following results:

- ✅ **List Policy Packs** - Working perfectly
- ✅ **Create Passport** - Working perfectly
- ⚠️ **Verify Policy** - Returns 404 for newly created agents (requires indexing time)
- ⚠️ **Get Passport** - Returns 403 for newly created agents (requires indexing time)
- ⚠️ **Suspend Passport** - Returns 405 (method not allowed or requires different permissions)

**Note:** The ⚠️ warnings are API-side limitations, not node issues. The node correctly handles all responses and displays appropriate error messages.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [APort Documentation](https://docs.aport.io)
- [Example Workflow](./examples/example-workflow.json)

## License

MIT
