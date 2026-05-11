# APort Shopify Refund Guardrail

Deployable Shopify refund guardrail that verifies an APort agent passport before submitting a Shopify refund. It is intentionally small so teams can copy the pattern into a production Shopify app.

## What It Does

- Verifies Shopify webhook HMAC signatures before any policy checks
- Extracts an APort agent ID from the refund payload
- Calls APort with the `payments.refund.v1` policy and refund context
- Enforces `passport.limits.refund_amount_max_per_tx` when present
- Submits the refund through Shopify Admin REST API only after verification
- Includes Jest/Supertest coverage with mocked APort and Shopify clients

## Setup

```bash
cd examples/ecommerce/shopify
npm install
cp .env.example .env
```

Fill in `.env`:

```bash
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_token
APORT_API_KEY=your_aport_key
APORT_REFUND_POLICY=payments.refund.v1
```

Run the app:

```bash
npm start
```

The webhook endpoint is:

```text
POST /webhooks/refunds/requested
```

## Example Payload

```json
{
  "agent_id": "agt_inst_refund_bot_123",
  "order_id": 1234567890,
  "amount": 42.5,
  "currency": "USD",
  "reason": "customer requested refund",
  "refund_line_items": [
    { "line_item_id": 111, "quantity": 1 }
  ]
}
```

## Policy Context Sent to APort

```json
{
  "shop": "your-shop.myshopify.com",
  "topic": "refunds/requested",
  "order_id": "1234567890",
  "refund_amount": 42.5,
  "currency": "USD",
  "reason": "customer requested refund"
}
```

If APort denies the policy, the app returns `403` and does not call Shopify. If the passport contains `limits.refund_amount_max_per_tx` and the request exceeds that value, the app also returns `403`.

## Tests

```bash
npm test
```

The test suite does not require live Shopify or APort credentials. It covers valid refunds, invalid HMAC signatures, denied APort policies, passport limit enforcement, and payload validation.

## Production Notes

- Store all credentials in environment variables or your platform secret manager.
- Use Shopify app OAuth to provision the Admin API access token.
- Subscribe this endpoint to your refund-request workflow or call it from your app before creating refunds.
- Keep the HMAC validation in front of all business logic.
- Add persistence for audit trails if your compliance process requires it.
