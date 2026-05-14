export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    shopifyWebhookSecret: env.SHOPIFY_WEBHOOK_SECRET,
    shopifyShopDomain: env.SHOPIFY_SHOP_DOMAIN,
    shopifyAdminAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    aportApiBaseUrl: env.APORT_API_BASE_URL || 'https://api.aport.io',
    aportApiKey: env.APORT_API_KEY,
    aportPolicyId: env.APORT_POLICY_ID || 'payments.refund.v1',
    aportAgentPassportId: env.APORT_AGENT_PASSPORT_ID || 'shopify-refund-agent',
    refundHoldTag: env.REFUND_HOLD_TAG || 'aport-refund-review',
  };
}

export function assertRequiredConfig(config) {
  const missing = [
    ['SHOPIFY_WEBHOOK_SECRET', config.shopifyWebhookSecret],
    ['SHOPIFY_SHOP_DOMAIN', config.shopifyShopDomain],
    ['APORT_API_KEY', config.aportApiKey],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.map(([key]) => key).join(', ')}`);
  }
}
