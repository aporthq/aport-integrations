# n8n APort Verification Node

This community node lets n8n workflows verify an APort passport against a policy pack and route each item into `Approved`, `Denied`, or `Error` outputs.

## Features

- Verifies a passport ID against any APort policy pack.
- Supports context from the incoming item JSON, a JSON object, or key/value fields.
- Routes workflow items by verification decision instead of requiring a separate IF node.
- Uses n8n credentials for the APort API key and base URL.
- Includes a sample workflow and unit tests for routing behavior.

## Installation

After the package is published, install it from an n8n instance that allows community nodes:

```bash
npm install n8n-nodes-aport
```

For local development from this repository:

```bash
cd examples/agent-frameworks/n8n
npm test
```

The package has no runtime dependencies; the tests use Node.js' built-in test runner. Link or copy the package into your n8n custom nodes directory according to your n8n deployment model.

To inspect the publishable package contents locally:

```bash
npm pack --dry-run
```

## Credentials

Create an **APort API** credential in n8n:

- `API Key`: optional bearer token for authenticated APort endpoints.
- `Base URL`: defaults to `https://aport.io`.

The verification node can still be configured without an API key when the target APort endpoint supports public verification.

## Node Inputs

| Field | Description |
| --- | --- |
| `Passport ID` | Agent passport identifier. The default expression reads `agent_id`, `passport_id`, or `passportId` from incoming JSON. |
| `Policy Pack` | APort policy identifier, for example `finance.payment.refund.v1`. |
| `Context Source` | Choose incoming item JSON, a JSON object, or key/value fields. |
| `Include Input Data` | Keeps the original item JSON in the routed output. |

## Outputs

1. `Approved`: APort returned an allow/approved/verified decision.
2. `Denied`: APort responded successfully but did not approve the action.
3. `Error`: Missing configuration, invalid context JSON, or request errors.

Each output item includes:

```json
{
  "aport": {
    "approved": true,
    "passportId": "agt_inst_demo_123",
    "policyPack": "finance.payment.refund.v1",
    "response": {
      "verified": true
    }
  }
}
```

## Example Workflow

Import `workflows/aport-verify-routing.json` into n8n. The workflow creates a sample refund context, verifies it with the APort node, then exposes the three routing branches for downstream actions such as approvals, Slack alerts, or manual review.

## Verification

```bash
npm test
```

The tests cover context construction, decision parsing, approved routing, denied routing, and error routing.
