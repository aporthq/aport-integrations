export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    shopifyWebhookSecret: env.SHOPIFY_WEBHOOK_SECRET || "",
    shopifyShopDomain: env.SHOPIFY_SHOP_DOMAIN || "",
    shopifyAdminAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
    aportApiKey: env.APORT_API_KEY || "",
    aportVerifyUrl: env.APORT_VERIFY_URL || "https://api.aport.io/v1/verify",
    aportPolicyId: env.APORT_POLICY_ID || "payments.refund.v1",
    failOpen: env.APORT_FAIL_OPEN === "true"
  }
}

export function validateConfig(config) {
  const missing = []
  if (!config.shopifyWebhookSecret) missing.push("SHOPIFY_WEBHOOK_SECRET")
  if (!config.aportApiKey) missing.push("APORT_API_KEY")
  if (missing.length > 0) {
    const err = new Error(`Missing required configuration: ${missing.join(", ")}`)
    err.statusCode = 500
    err.code = "missing_config"
    throw err
  }
}
