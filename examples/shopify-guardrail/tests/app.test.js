import assert from "node:assert/strict"
import { Readable, Writable } from "node:stream"
import test from "node:test"

import { createApp } from "../src/app.js"
import { computeShopifyHmac } from "../src/hmac.js"

const baseConfig = {
  port: 0,
  shopifyWebhookSecret: "test-secret",
  shopifyShopDomain: "test-shop.myshopify.com",
  shopifyAdminAccessToken: "",
  aportApiKey: "test-aport-key",
  aportVerifyUrl: "https://aport.test/verify",
  aportPolicyId: "payments.refund.v1",
  failOpen: false
}

test("approves refund when Shopify HMAC is valid and APort allows", async () => {
  const calls = []
  const app = createApp({
    config: baseConfig,
    aportClient: {
      async verifyRefund(context) {
        calls.push(context)
        return { allowed: true }
      }
    },
    shopifyService: {
      async approve(context) {
        return { status: "approved", refundId: context.refundId }
      }
    }
  })

  const response = await postWebhook(app, refundPayload({ amount: "42.00" }))
  assert.equal(response.status, 200)
  assert.equal(response.body.action, "approved")
  assert.equal(response.body.refund.amount, "42.00")
  assert.equal(response.body.refund.currency, "USD")
  assert.equal(calls.length, 1)
})

test("flags refund for manual review when APort denies", async () => {
  const app = createApp({
    config: baseConfig,
    aportClient: {
      async verifyRefund() {
        return { allowed: false, reason: "refund amount exceeds passport limit" }
      }
    },
    shopifyService: {
      async flagForManualReview(context, reason) {
        return { status: "manual_review_required", refundId: context.refundId, reason }
      }
    }
  })

  const response = await postWebhook(app, refundPayload({ amount: "9999.00" }))
  assert.equal(response.status, 202)
  assert.equal(response.body.action, "manual_review_required")
  assert.equal(response.body.reason, "refund amount exceeds passport limit")
})

test("rejects invalid Shopify HMAC before parsing payload", async () => {
  const app = createApp({ config: baseConfig })

  const response = await postWebhook(app, Buffer.from("{not-json"), {
    hmac: "invalid"
  })
  assert.equal(response.status, 401)
  assert.equal(response.body.error, "invalid_shopify_hmac")
})

test("returns malformed_json for validly signed invalid JSON", async () => {
  const app = createApp({ config: baseConfig })

  const rawBody = Buffer.from("{not-json")
  const response = await postWebhook(app, rawBody)
  assert.equal(response.status, 400)
  assert.equal(response.body.error, "malformed_json")
})

test("returns missing_config when required secrets are absent", async () => {
  const app = createApp({
    config: { ...baseConfig, aportApiKey: "" }
  })

  const response = await postWebhook(app, refundPayload({ amount: "10.00" }))
  assert.equal(response.status, 500)
  assert.equal(response.body.error, "missing_config")
})

test("health endpoint returns ok", async () => {
  const app = createApp({ config: baseConfig })

  const response = await invoke(app, { method: "GET", url: "/health" })
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true })
})

function refundPayload({ amount }) {
  return Buffer.from(
    JSON.stringify({
      id: 9001,
      order_id: 12345,
      created_at: "2026-05-15T00:00:00Z",
      transactions: [{ amount, currency: "USD" }],
      refund_line_items: [{ line_item_id: 1, quantity: 1, restock_type: "return" }]
    })
  )
}

async function postWebhook(app, rawBody, options = {}) {
  const hmac = options.hmac || computeShopifyHmac(rawBody, baseConfig.shopifyWebhookSecret)
  return invoke(app, {
    method: "POST",
    url: "/webhooks/shopify/refunds/create",
    headers: {
      "content-type": "application/json",
      "x-shopify-hmac-sha256": hmac,
      "x-shopify-shop-domain": "test-shop.myshopify.com",
      "x-shopify-topic": "refunds/create"
    },
    body: rawBody
  })
}

function invoke(app, { method, url, headers = {}, body = Buffer.alloc(0) } = {}) {
  return new Promise((resolve, reject) => {
    const req = Readable.from(body ? [body] : [])
    req.method = method
    req.url = url
    req.headers = headers

    const chunks = []
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk))
        callback()
      }
    })
    res.writeHead = (statusCode, responseHeaders) => {
      res.statusCode = statusCode
      res.headers = responseHeaders
    }
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.from(chunk))
      const text = Buffer.concat(chunks).toString("utf8")
      resolve({
        status: res.statusCode,
        headers: res.headers,
        body: text ? JSON.parse(text) : null
      })
    }

    Promise.resolve(app(req, res)).catch(reject)
  })
}
