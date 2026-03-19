const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Configuration
const CONFIG = {
  aportApiKey: process.env.APORT_API_KEY,
  aportProjectId: process.env.APORT_PROJECT_ID || 'default',
  shopifyApiKey: process.env.SHOPIFY_API_KEY,
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
  shopifyWebhookSigningKey: process.env.SHOPIFY_WEBHOOK_SIGNING_KEY,
  port: process.env.PORT || 3000
};

// Verify with APort
async function verifyWithAPort(action, actor, context) {
  if (!CONFIG.aportApiKey) {
    console.warn('APort API key not configured');
    return { allow: true, reasons: ['No API key'] };
  }

  try {
    const response = await axios.post('https://api.aport.io/verify', {
      action,
      actor,
      context: { data: context },
      projectId: CONFIG.aportProjectId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.aportApiKey}`
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('APort verification error:', error.message);
    return { allow: true, reasons: ['Verification failed'] };
  }
}

// Verify Shopify webhook signature
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return true;
  
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return hmac === signature;
}

// Extract actor from Shopify refund
function getActorFromRefund(refund, shop) {
  return {
    id: refund.created_by?.toString() || 'unknown',
    name: refund.created_by ? `shopify-user-${refund.created_by}` : 'system',
    owner: shop
  };
}

// Get context from Shopify refund
function getContextFromRefund(refund, order) {
  return {
    refund_id: refund.id?.toString(),
    order_id: refund.order_id?.toString(),
    shop: order?.email?.split('@')?.[1] || 'unknown',
    total_refund: refund.total_refund_set?.shop_money?.amount || '0',
    currency: refund.total_refund_set?.shop_money?.currency_code || 'USD',
    refund_reason: refund.note || 'no reason',
    payment_id: refund.transactions?.[0]?.id?.toString() || 'unknown'
  };
}

// Webhook handler for refunds
app.post('/webhooks/refunds/create', async (req, res) => {
  try {
    const signature = req.headers['x-shopify-hmac-sha256'] || 
                      req.headers['x-shopify-webhook-signature'];
    
    // Verify webhook signature
    if (!verifyWebhookSignature(req.rawBody, signature, CONFIG.shopifyWebhookSigningKey)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const refund = req.body;
    const order = refund.order;
    const shop = req.headers['x-shopify-shop-domain'];

    // Get actor and context
    const actor = getActorFromRefund(refund, shop);
    const context = getContextFromRefund(refund, order);

    // Verify with APort
    const result = await verifyWithAPort(
      'shopify_refund',
      actor,
      context
    );

    console.log('Refund verification result:', result);

    if (!result.allow) {
      // Log the blocked refund
      console.log('Refund blocked:', {
        refund_id: refund.id,
        reasons: result.reasons,
        actor: actor.id
      });

      return res.json({
        verified: false,
        blocked: true,
        reasons: result.reasons,
        action: 'refund_blocked'
      });
    }

    return res.json({
      verified: true,
      blocked: false,
      action: 'refund_allowed'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    // On error, allow the refund (fail-open)
    res.json({ verified: true, blocked: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'shopify-guardrail' });
});

// Manual refund verification endpoint
app.post('/api/verify-refund', async (req, res) => {
  try {
    const { refund_id, order_id, amount, actor_id, actor_name } = req.body;

    const actor = {
      id: actor_id || 'manual',
      name: actor_name || 'manual-check',
      owner: 'shopify'
    };

    const context = {
      refund_id: refund_id?.toString(),
      order_id: order_id?.toString(),
      amount: amount?.toString(),
      source: 'manual_api'
    };

    const result = await verifyWithAPort('shopify_refund_manual', actor, context);

    res.json(result);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
if (require.main === module) {
  app.listen(CONFIG.port, () => {
    console.log(`Shopify Guardrail running on port ${CONFIG.port}`);
  });
}

module.exports = { app, verifyWithAPort, CONFIG };
