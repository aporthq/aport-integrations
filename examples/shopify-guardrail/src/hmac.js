import crypto from "node:crypto"

export function computeShopifyHmac(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("base64")
}

export function verifyShopifyHmac(rawBody, receivedHmac, secret) {
  if (!rawBody || !receivedHmac || !secret) return false
  const expected = computeShopifyHmac(rawBody, secret)
  return timingSafeEqual(expected, receivedHmac)
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left, "utf8")
  const rightBuffer = Buffer.from(right, "utf8")
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}
