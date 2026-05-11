const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AP2AuthorizationBridge,
  AP2BridgeError,
} = require("../src/ap2-authorization-bridge");

const baseIntent = {
  id: "pi_test_001",
  payerAgentId: "agt_buyer_123",
  amount: { amount: 150, currency: "usd" },
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
};

test("authorizes a payment intent after APort policy verification", async () => {
  const calls = [];
  const bridge = new AP2AuthorizationBridge({
    now: () => new Date("2026-05-11T00:00:00Z"),
    aportClient: {
      async verify(policy, agentId, context) {
        calls.push({ policy, agentId, context });
        return { verified: true, id: "ver_123", passport: { agent_id: agentId } };
      },
    },
  });

  const result = await bridge.authorizePaymentIntent(baseIntent);

  assert.equal(result.authorized, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].policy, "payments.transfer.v1");
  assert.equal(calls[0].agentId, "agt_buyer_123");
  assert.equal(calls[0].context.amount, 150);
  assert.equal(calls[0].context.currency, "USD");
  assert.equal(result.ap2.mandateReceipt.result, "success");
  assert.equal(result.ap2.mandateReceipt.aport_verification_id, "ver_123");
  assert.equal(result.ap2.delegatePayload.delegate_payload[0].vct, "mandate.payment.1");
});

test("returns an AP2 error receipt when APort denies the payment", async () => {
  const bridge = new AP2AuthorizationBridge({
    aportClient: {
      async verify() {
        return { verified: false, message: "limit exceeded" };
      },
    },
  });

  const result = await bridge.authorizePaymentIntent(baseIntent);

  assert.equal(result.authorized, false);
  assert.equal(result.ap2.mandateReceipt.result, "error");
  assert.equal(result.ap2.mandateReceipt.error, "invalid_mandate");
  assert.match(result.ap2.mandateReceipt.error_description, /limit exceeded/);
});

test("returns an unresolved-constraint receipt when APort verification fails", async () => {
  const bridge = new AP2AuthorizationBridge({
    aportClient: {
      async verify() {
        throw new Error("service unavailable");
      },
    },
  });

  const result = await bridge.authorizePaymentIntent(baseIntent);

  assert.equal(result.authorized, false);
  assert.equal(result.ap2.mandateReceipt.result, "error");
  assert.equal(result.ap2.mandateReceipt.error, "unresolved_constraint");
  assert.match(result.ap2.mandateReceipt.error_description, /service unavailable/);
});

test("rejects invalid payment intents before calling APort", async () => {
  const bridge = new AP2AuthorizationBridge({
    aportClient: {
      async verify() {
        throw new Error("should not be called");
      },
    },
  });

  await assert.rejects(
    () =>
      bridge.authorizePaymentIntent({
        ...baseIntent,
        amount: { amount: 0, currency: "USD" },
      }),
    (error) =>
      error instanceof AP2BridgeError && error.code === "invalid_amount"
  );
});

test("creates stable references for equivalent payment intents", () => {
  const bridge = new AP2AuthorizationBridge();
  const first = bridge.createMandateReceipt(baseIntent).reference;
  const second = bridge.createMandateReceipt({
    payee: baseIntent.payee,
    amount: { currency: "USD", amount: 150 },
    payerAgentId: "agt_buyer_123",
    paymentInstrument: baseIntent.paymentInstrument,
    id: "pi_test_001",
  }).reference;

  assert.equal(first, second);
});
