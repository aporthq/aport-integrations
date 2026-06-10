# APort Power Automate Custom Connector

This example provides a Microsoft Power Automate custom connector definition for APort verification.

Use it to add an APort verification step before sensitive workflow actions such as refund approvals, admin changes, data exports, or repository operations.

## Files

- `apiDefinition.swagger.json` - OpenAPI 2.0 connector definition for Power Automate custom connectors.
- `apiProperties.json` - Connection parameter metadata for the APort `Authorization` header.
- `examples/refund-approval-flow.json` - Example flow shape showing how to gate a refund approval.

## Import

1. In Power Automate, open **Data > Custom connectors**.
2. Choose **New custom connector > Import an OpenAPI file**.
3. Upload `apiDefinition.swagger.json`.
4. Configure the API key connection using the format `Bearer YOUR_APORT_API_KEY`.
5. Create a flow and add the **Verify an action** operation before the protected step.

## Example Request

```json
{
  "policy_pack": "finance.payment.refund.v1",
  "context": {
    "action": "approve_refund",
    "resource": "order_123",
    "amount": 25,
    "currency": "USD",
    "actor": "support@example.com"
  }
}
```

## Handling Decisions

The connector returns the APort decision payload. Add a Power Automate condition that checks:

```text
@equals(body('Verify_an_action')?['decision']?['allow'], true)
```

If your APort deployment wraps the decision under `data.decision`, use:

```text
@equals(body('Verify_an_action')?['data']?['decision']?['allow'], true)
```

## Validation

```bash
node tests/validate-power-automate.js
```
