# Shopify Refund Guardrail

Production-style Shopify webhook example that verifies refund webhooks with APort before approving downstream refund handling.

## What It Does

- Receives Shopify `refunds/create` webhooks.
- Verifies `X-Shopify-Hmac-Sha256` before parsing the payload.
- Builds a `payments.refund.v1` verification context for APort.
- Fails closed on invalid signatures, malformed payloads, missing config, and deny/error responses.
- Returns a review-required response for denied refunds so operators can handle them manually.

## Quick Start

1. Copy `env.example` to `.env` and fill in Shopify and APort credentials.
2. Run `npm test` to verify guardrail behavior locally.
3. Run `npm start` and configure Shopify to send `refunds/create` webhooks to `/webhooks/shopify/refunds/create`.

## Local Replay

The replay script signs fixture payloads with `SHOPIFY_WEBHOOK_SECRET` and sends them to a running local server.

```bash
SHOPIFY_WEBHOOK_SECRET=dev-secret npm start
SHOPIFY_WEBHOOK_SECRET=dev-secret npm run replay:allow
SHOPIFY_WEBHOOK_SECRET=dev-secret npm run replay:deny
```

## Environment

| Variable | Purpose |
| --- | --- |
| `SHOPIFY_WEBHOOK_SECRET` | Required. Used to verify Shopify webhook HMAC signatures. |
| `SHOPIFY_SHOP_DOMAIN` | Optional. Used by `shopify.js` when calling the Admin API. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Optional. Required only for real Admin API calls. |
| `APORT_API_KEY` | Required. Bearer token for APort verification. |
| `APORT_VERIFY_URL` | Optional. Defaults to `https://api.aport.io/v1/verify`. |
| `APORT_POLICY_ID` | Optional. Defaults to `payments.refund.v1`. |
| `APORT_FAIL_OPEN` | Optional. Defaults to `false`; keep this false in production. |

## Verification Payload

The app sends APort a compact context:

```json
{
  "policyId": "payments.refund.v1",
  "action": "payments.refund",
  "resource": "shopify.refund",
  "context": {
    "shop": "example.myshopify.com",
    "orderId": "gid://shopify/Order/1",
    "refundId": "gid://shopify/Refund/1",
    "amount": "42.00",
    "currency": "USD",
    "lineItemCount": 2
  }
}
```

APort allow responses continue processing. Deny/error responses return `202 Accepted` with `manual_review_required` so Shopify delivery succeeds while the refund is flagged for human review.

## Files

- `src/app.js` creates the HTTP app and webhook route.
- `src/hmac.js` verifies Shopify HMAC signatures.
- `src/aport.js` wraps APort verification.
- `src/shopify.js` isolates Shopify Admin follow-up behavior.
- `tests/app.test.js` covers allow, deny, malformed payloads, bad HMACs, and missing config.
