const express = require("express");
const { APortClient } = require("./aport-client");
const { ShopifyClient } = require("./shopify-client");
const { verifyShopifyHmac } = require("./hmac");

function createApp({
  aportClient = new APortClient(),
  shopifyClient = new ShopifyClient(),
  webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET,
  refundPolicy = process.env.APORT_REFUND_POLICY || "payments.refund.v1",
} = {}) {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    "/webhooks/refunds/requested",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        if (!verifyShopifyHmac(req.body, req.get("X-Shopify-Hmac-Sha256"), webhookSecret)) {
          return res.status(401).json({
            error: "invalid_shopify_hmac",
            message: "Webhook signature verification failed.",
          });
        }

        const payload = parsePayload(req.body);
        const refundRequest = normalizeRefundRequest(payload);
        const verification = await aportClient.verify(refundPolicy, refundRequest.agentId, {
          shop: req.get("X-Shopify-Shop-Domain"),
          topic: req.get("X-Shopify-Topic"),
          order_id: refundRequest.orderId,
          refund_amount: refundRequest.amount,
          currency: refundRequest.currency,
          reason: refundRequest.reason,
        });

        if (!verification.verified) {
          return res.status(403).json({
            error: "aport_policy_denied",
            message: verification.message || "APort policy denied the refund.",
            details: verification.details,
          });
        }

        const maxRefund = verification.passport?.limits?.refund_amount_max_per_tx;

        if (typeof maxRefund === "number" && refundRequest.amount > maxRefund) {
          return res.status(403).json({
            error: "refund_limit_exceeded",
            message: "Refund amount exceeds the agent passport limit.",
            requested: refundRequest.amount,
            limit: maxRefund,
          });
        }

        const shopifyResult = await shopifyClient.createRefund(refundRequest.orderId, {
          notify: true,
          note: `APort verified refund by ${refundRequest.agentId}`,
          transactions: [
            {
              kind: "refund",
              gateway: "manual",
              amount: refundRequest.amount.toFixed(2),
            },
          ],
          refund_line_items: refundRequest.lineItems,
        });

        return res.status(202).json({
          status: "refund_submitted",
          agent_id: refundRequest.agentId,
          policy: refundPolicy,
          shopify: shopifyResult,
        });
      } catch (error) {
        return res.status(400).json({
          error: "refund_guardrail_error",
          message: error.message,
        });
      }
    },
  );

  return app;
}

function parsePayload(rawBody) {
  try {
    return JSON.parse(rawBody.toString("utf8"));
  } catch (_error) {
    throw new Error("Webhook payload must be valid JSON.");
  }
}

function normalizeRefundRequest(payload) {
  const agentId = payload.agent_id || payload.agentId || payload.note_attributes?.agent_id;
  const orderId = String(payload.order_id || payload.orderId || payload.admin_graphql_api_id || "");
  const amount = Number(payload.amount || payload.refund_amount || payload.total_refund_amount);
  const currency = payload.currency || "USD";

  if (!agentId) {
    throw new Error("Refund payload must include agent_id.");
  }

  if (!orderId) {
    throw new Error("Refund payload must include order_id.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Refund payload must include a positive amount.");
  }

  return {
    agentId,
    orderId,
    amount,
    currency,
    reason: payload.reason || payload.note || "customer_refund",
    lineItems: Array.isArray(payload.refund_line_items) ? payload.refund_line_items : [],
  };
}

module.exports = {
  createApp,
  normalizeRefundRequest,
  parsePayload,
};
