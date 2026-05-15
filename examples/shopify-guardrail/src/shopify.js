export class ShopifyRefundService {
  constructor({ shopDomain, adminAccessToken, fetchImpl = globalThis.fetch } = {}) {
    this.shopDomain = shopDomain
    this.adminAccessToken = adminAccessToken
    this.fetch = fetchImpl
  }

  async approve(refundContext) {
    return {
      status: "approved",
      orderId: refundContext.orderId,
      refundId: refundContext.refundId
    }
  }

  async flagForManualReview(refundContext, reason) {
    if (!this.shopDomain || !this.adminAccessToken || !refundContext.orderId) {
      return {
        status: "manual_review_required",
        reason,
        orderId: refundContext.orderId,
        refundId: refundContext.refundId
      }
    }

    // Real stores can replace this with an Admin API tag/metafield update.
    return {
      status: "manual_review_required",
      reason,
      orderId: refundContext.orderId,
      refundId: refundContext.refundId
    }
  }
}
