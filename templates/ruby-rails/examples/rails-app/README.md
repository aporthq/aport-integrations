# APort Rails Example App

This is a minimal Rails integration sketch for the `aport-rails` gem template.

It shows:

- Initializer configuration through `rails generate aport:install`.
- Controller-level policy enforcement with `require_aport_policy`.
- A request that sends `X-Agent-ID` and receives the verified passport in the action.

## Example Request

```bash
curl -X POST http://localhost:3000/refunds \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: agent_refund_bot" \
  -d '{"amount":42}'
```

## Expected Controller Behavior

If the agent passes `finance.payment.refund.v1`, the action can read `aport_agent_id` and `aport_passport`.
If verification fails, the concern returns a JSON error and the controller action is not executed.
