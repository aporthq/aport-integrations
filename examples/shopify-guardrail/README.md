# Shopify Refund Guardrail

Shopify app that verifies refund requests using APort before processing.

## What It Does

Intercepts Shopify refund webhooks and verifies each refund with APort before allowing it to proceed.

## Installation

```bash
npm install
```

## Configuration

```env
# Required
APORT_API_KEY=your-aport-api-key
APORT_PROJECT_ID=your-project-id

# Shopify (one method required)
SHOPIFY_WEBHOOK_SIGNING_KEY=your-webhook-signing-key
# OR
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret

PORT=3000
```

## Setup Shopify Webhooks

1. Go to Shopify Admin → Settings → Notifications
2. Create webhook for "Refunds" (refunds/create)
3. Set URL to your deployed app's webhook endpoint
4. Note the webhook signing key

## Usage

### Start Server

```bash
node index.js
```

### Webhook Endpoint

```
POST /webhooks/refunds/create
```

Shopify will send refund webhooks here. The app verifies each one with APort.

### Manual Verification

```
POST /api/verify-refund
{
  "refund_id": "12345",
  "order_id": "67890",
  "amount": "50.00",
  "actor_id": "user123",
  "actor_name": "John"
}
```

## How It Works

1. Shopify creates a refund
2. Webhook sent to `/webhooks/refunds/create`
3. App verifies with APort
4. If allowed: proceed normally
5. If denied: log and return blocked response

## Example Use Cases

- Block refunds over certain amount
- Block refunds from flagged users
- Require approval for high-value refunds
- Rate limit refund requests

## Deployment

### Heroku

```bash
heroku create shopify-guardrail
heroku config:set APORT_API_KEY=xxx
heroku config:set APORT_PROJECT_ID=xxx
heroku config:set SHOPIFY_WEBHOOK_SIGNING_KEY=xxx
git push heroku main
```

### Vercel

```bash
vercel deploy
```

## License

MIT
