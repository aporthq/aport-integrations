# APort Shopify Refund Guardrail

This example is a deployable Shopify webhook app that checks refund events against the APort `payments.refund.v1` policy before a team treats the refund as approved.

## What It Does

- Verifies Shopify refund webhook signatures with the `X-Shopify-Hmac-Sha256` header.
- Fetches the related Shopify order when an Admin API token is configured.
- Sends refund amount, order context, and agent passport details to APort `/v1/verify`.
- Allows policy-approved refunds.
- Tags denied refunds with `aport-refund-review` so operators can review them manually.
- Returns clear JSON outcomes for approved, held, invalid, and verification-failed requests.

## Setup

```bash
cd examples/ecommerce/shopify-guardrail
cp env.example .env
npm install
npm start
```

Register the webhook URL in Shopify:

```text
POST https://your-domain.example/webhooks/refunds/create
Topic: refunds/create
Format: JSON
```

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `SHOPIFY_WEBHOOK_SECRET` | yes | Shopify webhook signing secret. |
| `SHOPIFY_SHOP_DOMAIN` | yes | Store domain, for example `your-store.myshopify.com`. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | no | Admin API token used to fetch and tag orders. |
| `APORT_API_BASE_URL` | no | Defaults to `https://api.aport.io`. |
| `APORT_API_KEY` | yes | APort API key. |
| `APORT_POLICY_ID` | no | Defaults to `payments.refund.v1`. |
| `APORT_AGENT_PASSPORT_ID` | no | Passport ID used for the refund automation agent. |
| `REFUND_HOLD_TAG` | no | Tag applied when APort denies a refund. |

## Verification Flow

1. Shopify sends a `refunds/create` webhook.
2. The app rejects the request unless the HMAC signature is valid.
3. The app builds an APort verification payload with the refund amount, currency, order ID, refund ID, shop, and policy ID.
4. If APort returns `allowed: true` or `decision: "allow"`, the webhook returns `approved`.
5. Otherwise the app tags the order for manual review and returns `held_for_review`.

## Tests

```bash
npm test
```

The test suite covers invalid webhook signatures, approved refunds, denied refunds with Shopify order tagging, and the APort payload builder.
