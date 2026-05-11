# n8n APort Node

Custom n8n community node for verifying APort passports and policy packs inside visual workflows.

The node is designed for automation flows that need to decide whether an AI agent, service account, or delegated workflow is allowed to continue. It accepts an APort agent/passport ID plus workflow context, calls APort verification endpoints, and returns route-friendly fields such as `aport_verified` and `aport_route`.

## Features

- APort API credential type with API key, base URL, and timeout settings
- `Verify Policy` operation for policy-pack checks
- `Get Passport` operation for retrieving passport details
- JSON or key/value context input
- Optional merge of incoming n8n item JSON into the verification context
- `throwOnDeny` mode for fail-fast workflows
- Route-friendly output for IF/Switch nodes
- Mocked unit tests that do not require a live APort API key

## Install Locally

From this directory:

```bash
npm install
npm test
npm link
```

Then link it into your n8n custom node directory:

```bash
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm link n8n-nodes-aport
n8n start
```

For Docker-based n8n, copy this folder into the image or mount it as a custom node package and run `npm install` from the package directory.

## Configure Credentials

Create an `APort API` credential in n8n:

| Field | Description |
| --- | --- |
| API Key | Optional bearer token for authenticated APort requests |
| Base URL | APort API base URL, defaults to `https://aport.io` |
| Request Timeout | HTTP timeout in milliseconds |

## Verify Policy Operation

Recommended node settings:

| Setting | Example |
| --- | --- |
| Operation | `Verify Policy` |
| Agent ID | `={{ $json.agent_id }}` |
| Policy Pack | `finance.payment.refund.v1` |
| Include Input JSON in Context | `true` |
| Context JSON | `{"source":"n8n","workflow":"refund-verification"}` |
| Throw on Deny | `false` |

The node sends this payload shape to APort:

```json
{
  "context": {
    "agent_id": "agt_inst_demo_123",
    "policy_id": "finance.payment.refund.v1",
    "context": {
      "order_id": "order_1001",
      "amount": 149.99,
      "source": "n8n"
    }
  }
}
```

## Output

Successful and denied checks both produce one output item unless `Throw on Deny` is enabled.

```json
{
  "order_id": "order_1001",
  "amount": 149.99,
  "aport_verified": true,
  "aport_route": "verified",
  "aport": {
    "verified": true,
    "route": "verified",
    "passport": {
      "agent_id": "agt_inst_demo_123"
    },
    "policy": "finance.payment.refund.v1",
    "message": "Policy verified"
  }
}
```

Use `aport_route` in an IF or Switch node:

- `verified`: continue the trusted branch
- `denied`: route to manual review, rejection, alerting, or a fallback workflow

## Example Workflow

Import [`examples/aport-verify-workflow.json`](examples/aport-verify-workflow.json) into n8n. It creates:

1. Manual trigger
2. Sample refund context
3. APort policy verification
4. IF routing based on `aport_route`

Replace the credential placeholder with your local APort credential before running.

## Development

```bash
npm test
```

The tests bind the node to a mocked n8n execution context, capture HTTP requests, and verify:

- credential headers and normalized base URL
- APort verification payload shape
- JSON and key/value context modes
- denied verification behavior
- passport retrieval behavior

## Publishing Checklist

Before publishing to npm:

1. Confirm the package name starts with `n8n-nodes-`.
2. Keep the `n8n` package metadata pointing at all node and credential files.
3. Run `npm test`.
4. Test local install with `npm link`.
5. Import the example workflow and verify the node appears in n8n.
