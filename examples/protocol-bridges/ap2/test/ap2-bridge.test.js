const {
  AP2Client,
  APortAP2Bridge,
  AP2BridgeError,
  APortAuthorizationError,
  appendAPortPolicyTrace,
  buildAPortContext,
} = require("../index");

const sampleIntent = {
  id: "ap2_pi_123",
  amount: {
    value: "149.99",
    currency: "USDC",
  },
  participants: {
    buyer: "did:ap2:buyer-bot",
    seller: "did:ap2:merchant-agent",
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
    },
  ],
  mandates: {
    intentMandateId: "mandate_intent_123",
    cartMandateId: "mandate_cart_123",
  },
};

describe("APort AP2 bridge", () => {
  it("builds APort verification context from an AP2 payment intent", () => {
    const context = buildAPortContext(sampleIntent, { tenantId: "merchant-1" });

    expect(context.tenantId).toBe("merchant-1");
    expect(context.ap2).toMatchObject({
      intentId: "ap2_pi_123",
      amount: "149.99",
      amountMinor: 14999,
      currency: "USDC",
      buyerDid: "did:ap2:buyer-bot",
      sellerDid: "did:ap2:merchant-agent",
      settlementRail: "x402",
      captureType: "escrow_release",
      releaseCondition: "shipment-confirmed",
    });
    expect(context.ap2.lineItems).toHaveLength(1);
    expect(context.ap2.mandates.intentMandateId).toBe("mandate_intent_123");
  });

  it("adds AP2 policyTrace evidence for an allowed APort decision", () => {
    const tracedIntent = appendAPortPolicyTrace(
      sampleIntent,
      {
        allow: true,
        decision_id: "dec_123",
        assurance_level: "domain",
      },
      "finance.payment.authorization.v1",
      new Date("2026-05-11T12:00:00.000Z")
    );

    expect(tracedIntent.policyTrace).toEqual([
      {
        verifier: "aport",
        ruleId: "finance.payment.authorization.v1",
        outcome: "allow",
        message: "APort passport authorization passed",
        decisionId: "dec_123",
        assuranceLevel: "domain",
        evaluatedAt: "2026-05-11T12:00:00.000Z",
      },
    ]);
  });

  it("authorizes and creates an AP2 payment intent when APort allows", async () => {
    const aportClient = {
      verifyPolicy: jest.fn().mockResolvedValue({
        allow: true,
        decision_id: "dec_allow",
        assurance_level: "github",
      }),
    };
    const ap2Client = {
      createPaymentIntent: jest.fn().mockResolvedValue({
        id: "ap2_pi_123",
        status: "authorized",
      }),
    };
    const bridge = new APortAP2Bridge({
      aportClient,
      ap2Client,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
    });

    const result = await bridge.createAuthorizedPaymentIntent(sampleIntent, {
      agentId: "agt_inst_buyer",
      policyId: "finance.payment.authorization.v1",
      context: {
        merchantRiskTier: "low",
      },
    });

    expect(aportClient.verifyPolicy).toHaveBeenCalledWith(
      "agt_inst_buyer",
      "finance.payment.authorization.v1",
      expect.objectContaining({
        merchantRiskTier: "low",
        ap2: expect.objectContaining({
          intentId: "ap2_pi_123",
          amountMinor: 14999,
        }),
      }),
      "ap2_pi_123"
    );
    expect(ap2Client.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ap2_pi_123",
        policyTrace: [
          expect.objectContaining({
            verifier: "aport",
            outcome: "allow",
            decisionId: "dec_allow",
          }),
        ],
      })
    );
    expect(result).toMatchObject({
      authorized: true,
      status: "authorized",
      ap2PaymentIntent: {
        id: "ap2_pi_123",
      },
    });
  });

  it("does not create an AP2 payment intent when APort denies", async () => {
    const aportClient = {
      verifyPolicy: jest.fn().mockResolvedValue({
        allow: false,
        decision_id: "dec_deny",
        reasons: [{ code: "limit_exceeded", message: "Payment cap exceeded" }],
      }),
    };
    const ap2Client = {
      createPaymentIntent: jest.fn(),
    };
    const bridge = new APortAP2Bridge({
      aportClient,
      ap2Client,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
    });

    const result = await bridge.createAuthorizedPaymentIntent(sampleIntent, {
      agentId: "agt_inst_buyer",
    });

    expect(ap2Client.createPaymentIntent).not.toHaveBeenCalled();
    expect(result.authorized).toBe(false);
    expect(result.status).toBe("denied");
    expect(result.paymentIntent.policyTrace[0]).toMatchObject({
      outcome: "deny",
      message: "Payment cap exceeded",
    });
  });

  it("can throw on denied APort authorization", async () => {
    const bridge = new APortAP2Bridge({
      aportClient: {
        verifyPolicy: jest.fn().mockResolvedValue({ allow: false }),
      },
      ap2Client: {
        createPaymentIntent: jest.fn(),
      },
    });

    await expect(
      bridge.createAuthorizedPaymentIntent(sampleIntent, {
        agentId: "agt_inst_buyer",
        throwOnDeny: true,
      })
    ).rejects.toBeInstanceOf(APortAuthorizationError);
  });

  it("confirms the AP2 payment intent with a summarized APort decision", async () => {
    const bridge = new APortAP2Bridge({
      aportClient: {
        verifyPolicy: jest.fn().mockResolvedValue({
          allow: true,
          decision_id: "dec_confirm",
          assurance_level: "domain",
        }),
      },
      ap2Client: {
        createPaymentIntent: jest.fn().mockResolvedValue({
          id: "ap2_pi_123",
          status: "authorized",
        }),
        confirmPaymentIntent: jest.fn().mockResolvedValue({
          id: "ap2_pi_123",
          status: "confirmed",
        }),
      },
    });

    const result = await bridge.confirmAuthorizedPaymentIntent(sampleIntent, {
      agentId: "agt_inst_buyer",
      sellerAcceptance: { acceptedBy: "merchant-agent" },
    });

    expect(result.confirmation.status).toBe("confirmed");
    expect(bridge.ap2Client.confirmPaymentIntent).toHaveBeenCalledWith(
      "ap2_pi_123",
      {
        sellerAcceptance: { acceptedBy: "merchant-agent" },
        aportDecision: {
          allow: true,
          decisionId: "dec_confirm",
          assuranceLevel: "domain",
          reasons: [],
        },
      }
    );
  });

  it("validates required AP2 fields before calling APort", async () => {
    const bridge = new APortAP2Bridge({
      aportClient: { verifyPolicy: jest.fn() },
      ap2Client: { createPaymentIntent: jest.fn() },
    });

    await expect(
      bridge.createAuthorizedPaymentIntent({ amount: { value: "10" } })
    ).rejects.toThrow("paymentIntent.amount.value and paymentIntent.amount.currency");

    expect(bridge.aportClient.verifyPolicy).not.toHaveBeenCalled();
  });
});

describe("AP2Client", () => {
  it("posts payment intents to the configured AP2 base URL", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: "ap2_pi_123", status: "pending" }),
    });
    const client = new AP2Client({
      baseUrl: "https://merchant.example/v1/ap2/",
      token: "ap2-token",
      fetchImpl,
    });

    const result = await client.createPaymentIntent(sampleIntent);

    expect(result.status).toBe("pending");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://merchant.example/v1/ap2/payment-intents",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ap2-token",
        },
        body: JSON.stringify(sampleIntent),
      })
    );
  });

  it("raises AP2BridgeError for AP2 API failures", async () => {
    const client = new AP2Client({
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ error: "expired mandate" }),
      }),
    });

    await expect(client.createPaymentIntent(sampleIntent)).rejects.toBeInstanceOf(
      AP2BridgeError
    );
  });
});
