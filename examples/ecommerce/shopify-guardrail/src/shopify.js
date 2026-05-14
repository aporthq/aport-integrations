import crypto from 'node:crypto';

export class ShopifyWebhookError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ShopifyWebhookError';
  }
}

export function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!secret) {
    throw new ShopifyWebhookError('SHOPIFY_WEBHOOK_SECRET is required');
  }

  if (!hmacHeader) {
    return false;
  }

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  const expected = Buffer.from(digest, 'utf8');
  const received = Buffer.from(hmacHeader, 'utf8');

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function fetchShopifyOrder(orderId, config, fetchImpl = globalThis.fetch) {
  if (!orderId || !config.shopifyAdminAccessToken) {
    return null;
  }

  const response = await fetchImpl(
    `https://${config.shopifyShopDomain}/admin/api/2024-10/orders/${orderId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': config.shopifyAdminAccessToken,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new ShopifyWebhookError(`Failed to fetch Shopify order ${orderId}`);
  }

  const body = await response.json();
  return body.order || null;
}

export async function tagOrderForReview(orderId, config, fetchImpl = globalThis.fetch) {
  if (!orderId || !config.shopifyAdminAccessToken || !config.refundHoldTag) {
    return;
  }

  const order = await fetchShopifyOrder(orderId, config, fetchImpl);
  const existingTags = order?.tags
    ? order.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  if (existingTags.includes(config.refundHoldTag)) {
    return;
  }

  const tags = [...existingTags, config.refundHoldTag].join(', ');

  const response = await fetchImpl(
    `https://${config.shopifyShopDomain}/admin/api/2024-10/orders/${orderId}.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': config.shopifyAdminAccessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order: { id: orderId, tags } }),
    },
  );

  if (!response.ok) {
    throw new ShopifyWebhookError(`Failed to tag Shopify order ${orderId}`);
  }
}
