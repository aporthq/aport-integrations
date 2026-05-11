# APort Microsoft Power Automate Connector

This directory contains a Microsoft Power Automate custom connector for APort
policy verification. It lets a workflow verify an agent passport before a
business action such as approving a refund, exporting data, confirming a
marketplace order, or posting a team update.

## What Is Included

- `apiDefinition.swagger.json` - Power Automate-compatible Swagger 2.0 custom
  connector definition.
- `apiProperties.json` - connector metadata, API key connection parameter, and
  authorization header policy.
- `examples/verify-policy-workflow.json` - importable reference flow showing
  policy verification before a conditional action.
- `tests/validate-connector.js` - dependency-free validation for the connector
  JSON files and required operations.

## Supported Actions

| Action | APort endpoint | Purpose |
| --- | --- | --- |
| Verify policy | `POST /api/verify/policy/{policyId}` | Verify an agent against a policy pack with workflow context. |
| Get passport | `GET /api/verify/{agentId}` | Fetch public passport data through the verification endpoint. |
| List policies | `GET /api/policies` | Populate policy selection lists or admin flows. |
| Get policy pack | `GET /api/policies/{policyId}` | Inspect a single policy pack before use. |
| Suspend passport | `POST /api/suspend` | Suspend a compromised or misbehaving agent passport. |

## Import With Power Automate

1. Open Power Automate.
2. Go to **Data > Custom connectors > New custom connector > Import an OpenAPI file**.
3. Upload `apiDefinition.swagger.json`.
4. In the connector editor, import `apiProperties.json` or copy the API key
   security settings manually.
5. Create a connection and paste your APort API key.
6. Test the `Verify policy` action with:

```json
{
  "policyId": "finance.payment.refund.v1",
  "body": {
    "context": {
      "agent_id": "ap_a2d10232c6534523812423eec8a1425c",
      "policy_id": "finance.payment.refund.v1",
      "context": {
        "amount": 50,
        "currency": "USD",
        "workflow": "refund-approval"
      }
    }
  }
}
```

The default connector host is `aport.io`. For staging or self-hosted testing,
duplicate the connector and edit the `host` value in `apiDefinition.swagger.json`.

## Import With paconn CLI

```bash
paconn create --api-def apiDefinition.swagger.json --api-prop apiProperties.json
```

## Example Workflow

`examples/verify-policy-workflow.json` demonstrates this pattern:

1. Receive or build workflow context.
2. Call `Verify policy`.
3. Branch on `verified`.
4. Continue the protected workflow only when APort returns `verified: true`.
5. Terminate with a clear error message when verification fails.

The workflow file uses placeholder connector IDs because Power Automate assigns
environment-specific connector names at import time.

## Error Handling Guidance

- Treat HTTP `401` and `403` as connection configuration failures. Refresh the
  connector connection and confirm the API key.
- Treat `verified: false` as a business denial, not a platform error. Branch the
  flow to notify the requester and stop the protected action.
- Retry transient HTTP `429` or `5xx` responses with Power Automate retry
  policies. Keep protected actions after the verification step so retries do not
  execute the action before trust is established.
- Store sensitive workflow data in `context` only when it is required by the
  selected policy pack.

## Local Validation

Run the connector validation script before opening a PR:

```bash
node examples/platform-integrations/power-automate/tests/validate-connector.js
```

The script parses both connector JSON files and checks that all expected APort
operations are present.
