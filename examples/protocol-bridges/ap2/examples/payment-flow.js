const { AP2AuthorizationBridge } = require("../src");

class DemoAPortClient {
  async verify(policy, agentId, context) {
    return {
      verified: context.amount <= 500,
      id: "ver_demo_123",
      policy,
      agent_id: agentId,
      message:
        context.amount <= 500
          ? "Payment is within passport limits"
          : "Payment exceeds passport limits",
      passport: {
        agent_id: agentId,
        capabilities: ["payments.transfer"],
        limits: { payment_amount_max_per_tx: 500 },
      },
    };
  }
}

async function main() {
  const bridge = new AP2AuthorizationBridge({
    aportClient: new DemoAPortClient(),
    receiptIssuer: "demo-merchant.example",
  });

  const paymentIntent = {
    id: "pi_demo_001",
    payerAgentId: "agt_shopping_123",
    amount: { amount: 125, currency: "USD" },
    payee: {
      id: "merchant_001",
      name: "Demo Merchant",
      website: "https://demo-merchant.example",
    },
    paymentInstrument: {
      id: "card_token_4444",
      type: "dpc",
      description: "DPC **** 4444",
    },
    metadata: {
      cart_id: "cart_001",
      checkout_reference: "checkout_abc",
    },
  };

  const authorization = await bridge.authorizePaymentIntent(paymentIntent);

  console.log(JSON.stringify(authorization, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
