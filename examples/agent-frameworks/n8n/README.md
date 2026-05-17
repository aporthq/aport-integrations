# APort n8n Policy Check Node

Custom n8n community node for checking an agent against an APort policy inside an automation workflow.

## Features

- Calls the APort policy verification endpoint for every incoming item
- Supports n8n expressions for the policy ID, agent ID, and context fields
- Adds the verification result to the item JSON or returns only the APort result
- Provides credential storage for the APort API key and API base URL
- Handles invalid context JSON and failed API calls with item-level n8n errors

## Install Locally

```bash
cd examples/agent-frameworks/n8n
npm test
```

To test the node in a local n8n instance, follow the n8n community-node development workflow and link this package into your custom extensions directory.

## Credentials

Create an **APort API** credential in n8n:

| Field | Description |
| --- | --- |
| API Key | APort API key used for policy verification |
| Base URL | APort API base URL. Defaults to `https://aport.io` |

## Node Configuration

| Field | Description |
| --- | --- |
| Policy ID | APort policy pack identifier, for example `code.repository.merge.v1` |
| Agent ID | Agent passport identifier to verify |
| Context | Optional JSON object sent as the verification context |
| Include Input Data | When enabled, keeps incoming item data and writes the result to `aport` |

## Example Workflow Shape

1. Add any trigger node, such as **Manual Trigger**.
2. Add **APort Policy Check**.
3. Configure the APort credential.
4. Set:

```json
{
  "policyId": "code.repository.merge.v1",
  "agentId": "agt_123",
  "context": {
    "repository": "aporthq/aport-integrations",
    "action": "merge"
  }
}
```

The output includes:

```json
{
  "aport": {
    "allow": true,
    "reasons": [],
    "policyId": "code.repository.merge.v1",
    "agentId": "agt_123",
    "raw": {
      "allow": true,
      "reasons": []
    }
  }
}
```

## Verification

```bash
npm test
```
