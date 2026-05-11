# APort Zapier App

Zapier Platform CLI app that adds an **APort Verify** action to Zaps. The action accepts a Passport ID, a policy ID, and policy context, calls APort, then returns `allow`, `status`, and decision metadata so a Zap can route with Paths, Filters, or a follow-up action.

## Features

- Custom Zapier app with APort API-key authentication.
- `APort Verify` action for generic APort policy checks.
- Routeable output fields: `allow`, `status`, `decision_id`, `reasons`, and raw response data.
- Optional `Stop Zap on Deny` mode using Zapier's halted task behavior.
- Unit tests with mocked APort API calls.
- Example Zap blueprint in `examples/verify-passport-zap.json`.

## Quick Start

```bash
cd examples/platform-integrations/zapier
npm install
npm test
```

Optional local environment:

```bash
cp .env.example .env
```

## Authentication

The app uses Zapier custom authentication fields:

| Field | Required | Description |
| --- | --- | --- |
| `APort API Key` | No | Bearer token sent as `Authorization: Bearer <key>` when provided. |
| `APort API Base URL` | No | Defaults to `https://api.aport.io`; can point to sandbox or self-hosted deployments. |

The authentication test requests `/api/policies` to confirm the configured API endpoint is reachable.

## Action: APort Verify

Input fields:

| Field | Required | Description |
| --- | --- | --- |
| `Passport ID` | Yes | APort Passport or agent identifier. |
| `Policy ID` | Yes | Policy pack identifier such as `finance.payment.refund.v1`. |
| `Context JSON` | No | JSON object with policy-specific context. Money should use minor units, for example `500` for `$5.00`. |
| `Idempotency Key` | No | Forwarded in the request body and `Idempotency-Key` header. |
| `Stop Zap on Deny` | No | If true, denied decisions halt the step. If false, the step returns `allow: false` for routing. |

The request body follows the current APort Node SDK contract:

```json
{
  "agent_id": "ap_a2d10232c6534523812423eec8a1425c",
  "context": {
    "amount": 500,
    "currency": "USD",
    "order_id": "order_123"
  },
  "idempotency_key": "zap-run-123"
}
```

Example output:

```json
{
  "allow": true,
  "status": "allowed",
  "agent_id": "ap_a2d10232c6534523812423eec8a1425c",
  "policy_id": "finance.payment.refund.v1",
  "decision_id": "dec_123",
  "assurance_level": "verified",
  "expires_in": 300,
  "reasons": []
}
```

## Local Zapier Commands

```bash
# Run unit tests
npm test

# Validate the app schema
npm run validate

# Invoke the create action locally after configuring auth/input data
npx zapier-platform invoke create aport_verify \
  --inputData '{"agentId":"ap_a2d10232c6534523812423eec8a1425c","policyId":"finance.payment.refund.v1","context":"{\"amount\":500,\"currency\":\"USD\"}"}'
```

## Publishing as a Private or Public App

1. Install the Zapier Platform CLI and log in:
   ```bash
   npm install
   npx zapier-platform login
   ```
2. Register or link the integration:
   ```bash
   npx zapier-platform register "APort"
   ```
3. Validate and push:
   ```bash
   npm run validate
   npx zapier-platform push
   ```
4. In Zapier, create a connection, then add the **APort Verify** action to a Zap.

For public publishing, complete Zapier's review requirements after the private app has been tested with real users and examples.

## Example Zap

See `examples/verify-passport-zap.json` for a refund routing blueprint:

1. Catch a webhook with a Passport ID and refund context.
2. Run **APort Verify** with `finance.payment.refund.v1`.
3. Route through Zapier Paths:
   - `allow = true`: continue the refund workflow.
   - `allow = false`: notify operations or stop fulfillment.

## Development Notes

- The Zapier action uses native `z.request` so Zapier middleware, auth injection, logging, and testing behavior work normally.
- `@aporthq/sdk-node` is included as a dependency to match APort's supported JavaScript SDK contract and request shape.
- No secrets are hardcoded; all credentials come from Zapier authentication fields or local `.env` values during development.
