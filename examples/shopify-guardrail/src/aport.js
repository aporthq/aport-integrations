export class APortClient {
  constructor({ apiKey, verifyUrl, policyId, fetchImpl = globalThis.fetch }) {
    this.apiKey = apiKey
    this.verifyUrl = verifyUrl
    this.policyId = policyId
    this.fetch = fetchImpl
  }

  async verifyRefund(refundContext) {
    const response = await this.fetch(this.verifyUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        policyId: this.policyId,
        action: "payments.refund",
        resource: "shopify.refund",
        context: refundContext
      })
    })

    const payload = await readJson(response)
    if (!response.ok) {
      return {
        allowed: false,
        reason: payload.reason || payload.error || `APort returned HTTP ${response.status}`,
        raw: payload
      }
    }

    return {
      allowed: Boolean(payload.allowed ?? payload.allow ?? payload.decision === "allow"),
      reason: payload.reason || payload.message || null,
      raw: payload
    }
  }
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export function buildRefundContext({ payload, shop, topic }) {
  const transactions = Array.isArray(payload.transactions) ? payload.transactions : []
  const refundLineItems = Array.isArray(payload.refund_line_items) ? payload.refund_line_items : []
  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

  return {
    shop,
    topic,
    orderId: String(payload.order_id || payload.admin_graphql_api_id || ""),
    refundId: String(payload.id || ""),
    amount: totalAmount.toFixed(2),
    currency: transactions[0]?.currency || payload.currency || "UNKNOWN",
    lineItemCount: refundLineItems.length,
    restock: refundLineItems.some((item) => Boolean(item.restock_type)),
    createdAt: payload.created_at || null
  }
}
