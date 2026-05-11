const request = require("supertest");
const { createApp } = require("../src/app");
const { signShopifyPayload } = require("../src/hmac");

const SECRET = "test-secret";

function signedPayload(payload) {
  const body = JSON.stringify(payload);

  return {
    body,
    signature: signShopifyPayload(body, SECRET),
  };
}

function appWith({ aportResult, shopifyResult = { refund: { id: 123 } } } = {}) {
  const aportClient = {
    verify: jest.fn().mockResolvedValue(aportResult || {
      verified: true,
      passport: {
        limits: {
          refund_amount_max_per_tx: 100,
        },
      },
    }),
  };

  const shopifyClient = {
    createRefund: jest.fn().mockResolvedValue(shopifyResult),
  };

  return {
    app: createApp({
      aportClient,
      shopifyClient,
      webhookSecret: SECRET,
      refundPolicy: "payments.refund.v1",
    }),
    aportClient,
    shopifyClient,
  };
}

describe("Shopify refund guardrail", () => {
  it("accepts verified refund webhooks and submits Shopify refunds", async () => {
    const { app, aportClient, shopifyClient } = appWith();
    const { body, signature } = signedPayload({
      agent_id: "agt_refund_bot",
      order_id: 987,
      amount: 42.5,
      currency: "USD",
      refund_line_items: [{ line_item_id: 1, quantity: 1 }],
    });

    await request(app)
      .post("/webhooks/refunds/requested")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", signature)
      .set("X-Shopify-Shop-Domain", "example.myshopify.com")
      .send(body)
      .expect(202)
      .expect((response) => {
        expect(response.body.status).toBe("refund_submitted");
        expect(response.body.agent_id).toBe("agt_refund_bot");
      });

    expect(aportClient.verify).toHaveBeenCalledWith(
      "payments.refund.v1",
      "agt_refund_bot",
      expect.objectContaining({
        order_id: "987",
        refund_amount: 42.5,
        currency: "USD",
      }),
    );
    expect(shopifyClient.createRefund).toHaveBeenCalledWith(
      "987",
      expect.objectContaining({
        notify: true,
        transactions: [expect.objectContaining({ amount: "42.50" })],
      }),
    );
  });

  it("rejects webhooks with invalid Shopify signatures", async () => {
    const { app, aportClient, shopifyClient } = appWith();

    await request(app)
      .post("/webhooks/refunds/requested")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", "bad-signature")
      .send(JSON.stringify({ agent_id: "agt_refund_bot", order_id: 1, amount: 10 }))
      .expect(401);

    expect(aportClient.verify).not.toHaveBeenCalled();
    expect(shopifyClient.createRefund).not.toHaveBeenCalled();
  });

  it("rejects refunds when APort denies the policy", async () => {
    const { app, shopifyClient } = appWith({
      aportResult: {
        verified: false,
        message: "Agent suspended",
      },
    });
    const { body, signature } = signedPayload({ agent_id: "agt_bad", order_id: 1, amount: 10 });

    await request(app)
      .post("/webhooks/refunds/requested")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", signature)
      .send(body)
      .expect(403)
      .expect((response) => {
        expect(response.body.error).toBe("aport_policy_denied");
      });

    expect(shopifyClient.createRefund).not.toHaveBeenCalled();
  });

  it("rejects refunds over the passport limit", async () => {
    const { app, shopifyClient } = appWith();
    const { body, signature } = signedPayload({ agent_id: "agt_refund_bot", order_id: 1, amount: 101 });

    await request(app)
      .post("/webhooks/refunds/requested")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", signature)
      .send(body)
      .expect(403)
      .expect((response) => {
        expect(response.body.error).toBe("refund_limit_exceeded");
        expect(response.body.limit).toBe(100);
      });

    expect(shopifyClient.createRefund).not.toHaveBeenCalled();
  });

  it("validates required refund payload fields", async () => {
    const { app } = appWith();
    const { body, signature } = signedPayload({ order_id: 1, amount: 10 });

    await request(app)
      .post("/webhooks/refunds/requested")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", signature)
      .send(body)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toMatch(/agent_id/);
      });
  });
});
