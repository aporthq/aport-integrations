# APort Power Automate Connector

This custom connector lets Microsoft Power Automate flows verify APort agent passports and policy decisions before continuing with high-risk workflow steps.

## Included Files

- `apiDefinition.swagger.json` - Swagger 2.0 definition accepted by Power Automate custom connectors.
- `apiProperties.json` - connector metadata and API key connection setup.
- `examples/verify-before-approval-flow.json` - reference flow shape for a verify-then-approve workflow.

## Supported Actions

| Action | Power Automate operation | APort endpoint |
| --- | --- | --- |
| Verify policy | `VerifyPolicy` | `POST /api/verify/policy/{policyId}` |
| Verify passport | `VerifyPassport` | `GET /api/verify/{agentId}` |
| List policy packs | `ListPolicyPacks` | `GET /api/policies` |
| Get policy pack | `GetPolicyPack` | `GET /api/policies/{policyId}` |
| Create passport | `CreatePassport` | `POST /api/issue` |
| Get passport | `GetPassport` | `GET /api/passports/{agentId}` |
| Suspend passport | `SuspendPassport` | `POST /api/suspend` |

## Import

1. Open Power Automate.
2. Go to **Data > Custom connectors > New custom connector > Import an OpenAPI file**.
3. Upload `apiDefinition.swagger.json`.
4. In the Security tab, keep API key authentication in the `Authorization` header.
5. Create the connector, then create a connection using `Bearer <APORT_API_KEY>`.

If your tenant uses a proxy or staging host, update `host` in `apiDefinition.swagger.json` before importing.

## Example Verification Step

Use the **Verify policy** action before an approval, merge, refund, export, or other sensitive flow action.

```json
{
  "context": {
    "agent_id": "agt_inst_123",
    "policy_id": "code.repository.merge.v1",
    "context": {
      "repository": "aporthq/aport-integrations",
      "action": "pull_request.merge",
      "request_id": "@{workflow().run.name}"
    }
  }
}
```

Add a Condition step after verification:

- Continue when `verified` is `true` and `allowed` is not `false`.
- Send the `reason`, `message`, or full body to a review channel when the verification action fails.

## Error Handling Pattern

Power Automate marks non-2xx APort responses as failed actions. Use **Configure run after** on the denial path so the flow can report policy failures cleanly instead of stopping silently.

Recommended denial branch:

1. Compose the failed action body with `outputs('Verify_policy')?['body']`.
2. Send the details to Teams, email, or an incident queue.
3. Terminate with status `Cancelled` for expected policy denials, or `Failed` for 5xx service errors.

## Local Validation

Validate the connector JSON before importing:

```bash
python -m json.tool apiDefinition.swagger.json > /dev/null
python -m json.tool apiProperties.json > /dev/null
python -m json.tool examples/verify-before-approval-flow.json > /dev/null
```

## Notes

- Power Automate custom connectors require Swagger 2.0, so this definition intentionally uses Swagger 2.0 instead of OpenAPI 3.1.
- The API key value must include the `Bearer ` prefix because Power Automate injects the configured value directly into the `Authorization` header.
- `VerifyPassport` accepts JSON context as a string query parameter. Prefer `VerifyPolicy` for flows that already build structured JSON bodies.
