const crypto = require("crypto");

function verifyShopifyHmac(rawBody, header, secret) {
  if (!secret) {
    throw new Error("SHOPIFY_WEBHOOK_SECRET is required.");
  }

  if (!header) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(header, "utf8");

  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function signShopifyPayload(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
}

module.exports = {
  signShopifyPayload,
  verifyShopifyHmac,
};
