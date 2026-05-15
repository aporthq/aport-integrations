import http from "node:http"

import { APortClient, buildRefundContext } from "./aport.js"
import { loadConfig, validateConfig } from "./config.js"
import { verifyShopifyHmac } from "./hmac.js"
import { ShopifyRefundService } from "./shopify.js"

const MAX_BODY_BYTES = 1024 * 1024

export function createApp({
  config = loadConfig(),
  aportClient = new APortClient({
    apiKey: config.aportApiKey,
    verifyUrl: config.aportVerifyUrl,
    policyId: config.aportPolicyId
  }),
  shopifyService = new ShopifyRefundService({
    shopDomain: config.shopifyShopDomain,
    adminAccessToken: config.shopifyAdminAccessToken
  })
} = {}) {
  return async function app(req, res) {
    try {
      if (req.method === "GET" && req.url === "/health") {
        return sendJson(res, 200, { ok: true })
      }

      if (req.method !== "POST" || req.url !== "/webhooks/shopify/refunds/create") {
        return sendJson(res, 404, { error: "not_found" })
      }

      validateConfig(config)
      const rawBody = await readBody(req)
      const receivedHmac = req.headers["x-shopify-hmac-sha256"]
      if (!verifyShopifyHmac(rawBody, receivedHmac, config.shopifyWebhookSecret)) {
        return sendJson(res, 401, { error: "invalid_shopify_hmac" })
      }

      const payload = parseJson(rawBody)
      const refundContext = buildRefundContext({
        payload,
        shop: req.headers["x-shopify-shop-domain"] || config.shopifyShopDomain,
        topic: req.headers["x-shopify-topic"] || "refunds/create"
      })

      const verification = await aportClient.verifyRefund(refundContext)
      if (!verification.allowed) {
        const review = await shopifyService.flagForManualReview(
          refundContext,
          verification.reason || "APort denied refund"
        )
        return sendJson(res, 202, {
          ok: true,
          action: review.status,
          reason: verification.reason,
          refund: refundContext
        })
      }

      const approval = await shopifyService.approve(refundContext)
      return sendJson(res, 200, {
        ok: true,
        action: approval.status,
        refund: refundContext
      })
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.code || "internal_error",
        message: error.message
      })
    }
  }
}

export function createServer(options) {
  return http.createServer(createApp(options))
}

function parseJson(rawBody) {
  try {
    return JSON.parse(rawBody.toString("utf8"))
  } catch {
    const err = new Error("Webhook body must be valid JSON")
    err.statusCode = 400
    err.code = "malformed_json"
    throw err
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on("data", (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        const err = new Error("Webhook body exceeds 1 MiB limit")
        err.statusCode = 413
        err.code = "body_too_large"
        reject(err)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json" })
  res.end(JSON.stringify(payload))
}
