const { APortAP2Bridge } = require("../index");

async function main() {
  const aportClient = {
    async verifyPolicy(agentId, policyId, context, idempotencyKey) {
      console.log("APort verifyPolicy request:");
      console.log(JSON.stringify({ agentId, policyId, context, idempotencyKey }, null, 2));

      return {
        allow: true,
        decision_id: "dec_demo_ap2_001",
        assurance_level: "github",
        reasons: [],
      };
    },
  };

  const ap2Client = {
    async createPaymentIntent(paymentIntent) {
      return {
        ...paymentIntent,
        status: "authorized",
      };
    },
    async confirmPaymentIntent(intentId, confirmation) {
      return {
        id: intentId,
        status: "confirmed",
        confirmation,
      };
    },
  };

  const bridge = new APortAP2Bridge({
    aportClient,
    ap2Client,
    now: () => new Date("2026-05-11T12:00:00.000Z"),
  });

  const result = await bridge.confirmAuthorizedPaymentIntent(
    {
      id: "ap2_pi_demo_001",
      amount: {
        value: "149.99",
        currency: "USDC",
      },
      participants: {
        buyer: "did:ap2:buyer-bot-9f32",
        seller: "did:ap2:shoe-store-agent",
      },
      terms: {
        settlementRail: "x402",
        captureType: "escrow_release",
        releaseCondition: "shipment-confirmed",
        disputeWindow: "P5D",
      },
      lineItems: [
        {
          sku: "RUN-SHOE-01",
          quantity: 1,
          unitPrice: "149.99",
          metadata: {
            category: "running-shoes",
          },
        },
      ],
      mandates: {
        intentMandateId: "mandate_intent_demo_001",
        cartMandateId: "mandate_cart_demo_001",
        paymentMandateId: "mandate_payment_demo_001",
      },
    },
    {
      agentId: "agt_inst_demo_buyer",
      policyId: "finance.payment.authorization.v1",
      sellerAcceptance: {
        acceptedBy: "did:ap2:shoe-store-agent",
      },
    }
  );

  console.log("\nAuthorized AP2 payment flow:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
