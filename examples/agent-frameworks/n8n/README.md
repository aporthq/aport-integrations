# APort n8n Passport Router

Custom n8n community node that verifies an APort passport with `@aporthq/sdk-node` and routes each item through an `Allowed` or `Denied` output.

## Features

- Verifies a Passport ID against any APort policy pack.
- Sends JSON context from the workflow item into APort.
- Routes allowed decisions to output 1 and denied decisions to output 2.
- Supports idempotency keys for repeat-safe workflow execution.
- Handles invalid JSON, SDK failures, and denied decisions cleanly.

## Installation

From this repository:

```bash
cd examples/agent-frameworks/n8n
npm install
npm link
```

Then link the node package into your local n8n custom directory:

```bash
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm link n8n-nodes-aport-passport-router
n8n start
```

For a published package, install it from the n8n Community Nodes settings with package name `n8n-nodes-aport-passport-router`.

## Credentials

Create an `APort API` credential in n8n:

| Field | Default | Description |
| --- | --- | --- |
| Base URL | `https://api.aport.io` | APort API endpoint. Use sandbox or self-hosted URLs when needed. |
| API Key | empty | Optional for some verification endpoints, required for authenticated environments. |
| Timeout (MS) | `800` | Request timeout passed to the SDK. |

## Node Parameters

| Parameter | Description |
| --- | --- |
| Passport ID | APort passport or agent ID to verify. |
| Policy ID | Policy pack ID, such as `finance.payment.refund.v1`. |
| Context | JSON object sent to APort for policy evaluation. |
| Idempotency Key | Optional key for repeat-safe verification requests. |
| Include Input Data | Keeps incoming item JSON and writes the normalized result to `aport`. |

## Routing Behavior

The node has two outputs:

1. `Allowed`: receives items when the APort response contains an allowed decision.
2. `Denied`: receives items when APort denies the decision or when `Continue On Fail` is enabled and an error occurs.

The normalized output looks like this:

```json
{
  "aport": {
    "passportId": "ap_123",
    "policyId": "finance.payment.refund.v1",
    "allowed": true,
    "decisionId": "dec_123",
    "assuranceLevel": "verified",
    "reasons": [],
    "rawResponse": {
      "allow": true
    }
  }
}
```

## Example Workflow

Import `examples/passport-routing-workflow.json` into n8n. Replace:

- `ap_your_passport_id` with a real APort passport ID.
- The placeholder credential with your `APort API` credential.
- The context fields with your workflow-specific data.

## Testing

```bash
cd examples/agent-frameworks/n8n
npm test
```

The tests mock the SDK boundary and cover JSON parsing, decision normalization, output shaping, and client call validation.

## Development Notes

- No secrets are hardcoded.
- The package metadata includes n8n node and credential entry points.
- The node uses `@aporthq/sdk-node` through `client.verifyPolicy(passportId, policyId, context, idempotencyKey)`.
