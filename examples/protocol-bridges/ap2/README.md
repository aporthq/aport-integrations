# APort AP2 Payment Authorization Bridge

This example shows how to use APort passport verification as the authorization gate before an AP2 payment intent is created or confirmed.

AP2 uses signed mandates and payment intents to prove user authorization. APort adds an independent policy check for the agent passport, including limits, assurance level, and suspension state. The bridge writes the APort decision back into the AP2 `policyTrace` so the AP2 flow keeps a verifiable authorization record.

## What Is Included

- `APortAP2Bridge`: verifies an AP2 payment intent with `@aporthq/sdk-node`, appends an AP2 `policyTrace` entry, then creates or confirms the payment intent through an AP2 control plane.
- `AP2Client`: a small REST wrapper for AP2 `/v1/ap2/payment-intents` endpoints.
- Deny handling: denied APort decisions stop AP2 intent creation and can either return a structured result or throw.
- Tests for context mapping, policy trace generation, allow/deny behavior, confirmation payloads, and AP2 HTTP errors.
- A mocked payment-flow example that runs without external credentials.

## Install

```bash
cd examples/protocol-bridges/ap2
npm install
```

## Run The Local Demo

```bash
npm run example
```

The demo uses mocked APort and AP2 clients so you can inspect the authorization flow locally. For a live integration, set the variables from `.env.example` and instantiate the bridge without mock clients.

## Environment

```bash
APORT_API_KEY=aport_live_or_sandbox_key
APORT_BASE_URL=https://api.aport.io
APORT_AP2_POLICY_ID=finance.payment.authorization.v1

AP2_BASE_URL=https://merchant.example/v1/ap2
AP2_BEARER_TOKEN=ap2_control_plane_token
```

Use `APORT_AP2_POLICY_ID` for the APort policy pack that enforces your AP2 spending rules. The example defaults to `finance.payment.authorization.v1`; deployments can replace it with a policy pack that matches their APort tenant.

## Usage

```javascript
const { APortAP2Bridge } = require("./index");

const bridge = new APortAP2Bridge();

const result = await bridge.confirmAuthorizedPaymentIntent(
  {
    id: "ap2_pi_123",
    amount: {
      value: "149.99",
      currency: "USDC"
    },
    participants: {
      buyer: "did:ap2:buyer-bot-9f32",
      seller: "did:ap2:merchant-agent"
    },
    terms: {
      settlementRail: "x402",
      captureType: "escrow_release",
      releaseCondition: "shipment-confirmed",
      disputeWindow: "P5D"
    },
    lineItems: [
      {
        sku: "RUN-SHOE-01",
        quantity: 1,
        unitPrice: "149.99"
      }
    ],
    mandates: {
      intentMandateId: "mandate_intent_123",
      cartMandateId: "mandate_cart_123",
      paymentMandateId: "mandate_payment_123"
    }
  },
  {
    agentId: "agt_inst_buyer",
    policyId: "finance.payment.authorization.v1"
  }
);

if (!result.authorized) {
  console.log("Payment blocked", result.decision.reasons);
}
```

## Authorization Flow

1. Validate the AP2 payment intent shape.
2. Resolve the APort agent ID from `options.agentId`, `paymentIntent.agentId`, or the AP2 buyer DID.
3. Build APort verification context from the AP2 amount, currency, buyer/seller DIDs, settlement rail, line items, evidence, and mandate references.
4. Call `APortClient.verifyPolicy(agentId, policyId, context, idempotencyKey)`.
5. Append the decision to AP2 `policyTrace`.
6. If allowed, create the AP2 payment intent and optionally call `/confirm`.
7. If denied, return a `denied` result or throw `APortAuthorizationError` when `throwOnDeny` is enabled.

## Test

```bash
npm test
```

## AP2 Notes

This bridge follows the AP2 payment-intent and policy-trace shape from the AP2 specification and keeps AP2 settlement separate from APort authorization. AP2 still owns mandate signature verification, payment-intent lifecycle, and settlement proof creation. APort only decides whether the agent passport is authorized to initiate or confirm the payment.
