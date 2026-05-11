class ShopifyClient {
  constructor({ shop, accessToken, apiVersion, fetchImpl } = {}) {
    this.shop = shop || process.env.SHOPIFY_SHOP;
    this.accessToken = accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = apiVersion || process.env.SHOPIFY_API_VERSION || "2025-01";
    this.fetch = fetchImpl || globalThis.fetch;

    if (!this.fetch) {
      throw new Error("A fetch implementation is required.");
    }
  }

  async createRefund(orderId, refund) {
    if (!this.shop) {
      throw new Error("SHOPIFY_SHOP is required.");
    }

    if (!this.accessToken) {
      throw new Error("SHOPIFY_ACCESS_TOKEN is required.");
    }

    if (!orderId) {
      throw new Error("A Shopify order ID is required.");
    }

    const response = await this.fetch(
      `https://${this.shop}/admin/api/${this.apiVersion}/orders/${orderId}/refunds.json`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
          "User-Agent": "aport-shopify-refund-guardrail/1.0",
        },
        body: JSON.stringify({ refund }),
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.errors || payload.message || `Shopify refund failed with HTTP ${response.status}`);
    }

    return payload;
  }
}

module.exports = {
  ShopifyClient,
};
