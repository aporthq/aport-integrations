# APort AP2 Bridge

Proof-of-concept bridge that uses APort Passport policy verification before authorizing AP2 payment intents.

AP2's authorization model asks an agent to present a mandate proving that it is allowed to perform a payment action. This example maps an AP2-style payment intent into an APort policy context, calls APort verification, and returns an AP2-style mandate receipt.

## What It Includes

- `AP2AuthorizationBridge` for validating payment intents and calling APort.
- AP2 delegate payload generation for `mandate.payment.1`.
- Mandate receipts with `success`, `invalid_mandate`, and `unresolved_constraint` outcomes.
- A runnable demo payment flow.
- Unit tests using Node's built-in test runner.

## Install

```bash
cd examples/protocol-bridges/ap2
npm test
node examples/payment-flow.js
```

The tests use injected clients and do not call the live APort API.

For a real integration, install the official SDK and provide credentials:

```bash
npm install @aporthq/sdk-node
cp .env.example .env
```

## Usage

```javascript
const { AP2AuthorizationBridge } = require("./src");

const bridge = new AP2AuthorizationBridge({
  policyPack: process.env.APORT_POLICY_PACK || "payments.transfer.v1",
});

const result = await bridge.authorizePaymentIntent({
  id: "pi_123",
  payerAgentId: "agt_shopping_123",
  amount: { amount: 150, currency: "USD" },
  payee: {
    id: "merchant_1",
    name: "Generic Merchant",
    website: "https://merchant.example",
  },
  paymentInstrument: {
    id: "dpc_4444",
    type: "dpc",
    description: "DPC **** 4444",
  },
});

if (!result.authorized) {
  console.log(result.ap2.mandateReceipt);
}
```

## Flow

1. Merchant or verifier receives an AP2 payment intent.
2. The bridge validates required fields: intent ID, payer agent, amount, currency, and payee.
3. The bridge constructs an APort policy context with payment amount, currency, payee, agent ID, and a stable mandate reference.
4. APort verifies the payer agent's passport against `payments.transfer.v1`.
5. The bridge returns an AP2-style delegate payload and mandate receipt.

## Payment Intent Shape

```json
{
  "id": "pi_demo_001",
  "payerAgentId": "agt_shopping_123",
  "amount": { "amount": 125, "currency": "USD" },
  "payee": {
    "id": "merchant_001",
    "name": "Demo Merchant",
    "website": "https://demo-merchant.example"
  },
  "paymentInstrument": {
    "id": "card_token_4444",
    "type": "dpc",
    "description": "DPC **** 4444"
  }
}
```

## Error Handling

- Invalid local input raises `AP2BridgeError`.
- APort policy denial returns an AP2 mandate receipt with `error: "invalid_mandate"`.
- APort service failures return an AP2 mandate receipt with `error: "unresolved_constraint"`, which lets the caller fall back to a human-present or non-agentic flow.

## AP2 Alignment

This example follows the AP2 authorization pattern where a verifier receives a mandate and returns a signed mandate receipt. It intentionally does not implement SD-JWT cryptographic signing; production deployments should sign receipts with the verifier's key and verify AP2 mandates according to the AP2 spec.

References:

- AP2 Agent Authorization: https://ap2-protocol.org/ap2/agent_authorization/
- AP2 Specification: https://ap2-protocol.org/specification/
- APort SDKs: https://github.com/aporthq/aport-sdks
