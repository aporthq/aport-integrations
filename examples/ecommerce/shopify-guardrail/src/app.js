import express from 'express';
import { verifyRefundWithAPort } from './aport.js';
import { fetchShopifyOrder, tagOrderForReview, verifyShopifyWebhook } from './shopify.js';

export function createApp(config, dependencies = {}) {
  const app = express();
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const logger = dependencies.logger || console;

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/webhooks/refunds/create', express.raw({ type: 'application/json' }), async (req, res) => {
    const hmac = req.header('x-shopify-hmac-sha256');

    if (!verifyShopifyWebhook(req.body, hmac, config.shopifyWebhookSecret)) {
      return res.status(401).json({ error: 'Invalid Shopify webhook signature' });
    }

    let refund;
    try {
      refund = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON webhook payload' });
    }

    try {
      const order = await fetchShopifyOrder(refund.order_id, config, fetchImpl);
      const decision = await verifyRefundWithAPort(refund, order, config, fetchImpl);

      if (!decision.allowed) {
        await tagOrderForReview(refund.order_id, config, fetchImpl);
        logger.warn('Refund held for review by APort policy', {
          orderId: refund.order_id,
          refundId: refund.id,
          reason: decision.reason,
        });

        return res.status(202).json({
          status: 'held_for_review',
          decision: decision.decision,
          reason: decision.reason,
        });
      }

      logger.info('Refund approved by APort policy', {
        orderId: refund.order_id,
        refundId: refund.id,
      });

      return res.json({
        status: 'approved',
        decision: decision.decision,
        reason: decision.reason,
      });
    } catch (error) {
      logger.error('Refund guardrail failed', {
        orderId: refund.order_id,
        refundId: refund.id,
        error: error.message,
      });

      return res.status(502).json({
        status: 'verification_failed',
        error: 'Refund verification is temporarily unavailable',
      });
    }
  });

  return app;
}
