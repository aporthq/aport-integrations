import fs from "node:fs"

import { computeShopifyHmac } from "../src/hmac.js"

const file = process.argv[2]
if (!file) {
  console.error("Usage: node scripts/replay-webhook.js fixtures/refund-allow.json")
  process.exit(1)
}

const secret = process.env.SHOPIFY_WEBHOOK_SECRET
if (!secret) {
  console.error("SHOPIFY_WEBHOOK_SECRET is required")
  process.exit(1)
}

const rawBody = fs.readFileSync(file)
const hmac = computeShopifyHmac(rawBody, secret)
const url = process.env.WEBHOOK_URL || "http://localhost:3000/webhooks/shopify/refunds/create"

const response = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-shopify-hmac-sha256": hmac,
    "x-shopify-shop-domain": process.env.SHOPIFY_SHOP_DOMAIN || "example.myshopify.com",
    "x-shopify-topic": "refunds/create"
  },
  body: rawBody
})

console.log(response.status)
console.log(await response.text())
