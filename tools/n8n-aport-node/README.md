# n8n-nodes-aport

n8n community node for [APort](https://github.com/APort-Protocol/aport-integrations) Policy Checks.

## Features

- **Verify Policy** — Evaluate an agent against a policy
- **Verify Agent** — Verify an agent's compliance
- **Get Passport** — Retrieve an agent's passport view
- **Get Decision Token** — Get a decision token for a policy

## Install

```bash
cd ~/.n8n/custom
npm install n8n-nodes-aport
```

Restart n8n after installing.

## Configuration

1. Add an **APort API** credential with your API Key and Base URL
2. Add the **APort Verify** node to your workflow
3. Configure Resource (Agent/Policy), Operation, Agent ID, and Policy ID

## Node Parameters

| Parameter | Description |
|-----------|-------------|
| Resource | Agent or Policy |
| Operation | Verify / Get Passport / Get Decision Token |
| Agent ID | Agent identifier (supports expressions) |
| Policy ID | Policy identifier (supports expressions) |
| Context | JSON context for evaluation |

## Output

```json
{
  "allow": true,
  "decision_id": "dec_abc123",
  "reasons": ["All checks passed"]
}
```

## License

MIT
