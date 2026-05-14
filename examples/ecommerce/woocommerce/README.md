# APort WooCommerce Guardrail

WordPress/WooCommerce plugin example that verifies commerce actions with APort before recording order and refund decisions.

## Features

- Settings page under **Settings > APort WooCommerce** for API key, base URL, and policy ids.
- Checkout-order verification using `commerce.order.v1` by default.
- Refund verification using `payments.refund.v1` by default.
- Agent id discovery from `X-Agent-ID`, `X-APort-Agent-ID`, or the order meta key `_aport_agent_id`.
- Order notes for allow, deny, and transport-error outcomes.
- Last APort decision, policy, and agent id saved as order metadata.
- Authenticated REST endpoint for preflight refund checks: `POST /wp-json/aport-woocommerce/v1/verify-refund`.
- PHPUnit coverage for agent-id extraction and verification context builders.

## Install

1. Copy `examples/ecommerce/woocommerce` into `wp-content/plugins/aport-woocommerce`.
2. Activate **APort WooCommerce Guardrail** in WordPress.
3. Open **Settings > APort WooCommerce**.
4. Add your APort API key and confirm policy ids:
   - Orders: `commerce.order.v1`
   - Refunds: `payments.refund.v1`

## Agent identity

The plugin checks for an agent id in this order:

1. `X-Agent-ID` request header.
2. `X-APort-Agent-ID` request header.
3. WooCommerce order meta `_aport_agent_id`.

This keeps the example usable with API-driven checkouts, custom storefronts, and admin-created test orders.

## Refund preflight

For custom refund flows, call the REST endpoint before creating the refund:

```http
POST /wp-json/aport-woocommerce/v1/verify-refund
Content-Type: application/json

{
  "order_id": 42,
  "amount": 12.50,
  "agent_id": "agent_123"
}
```

Only users with `manage_woocommerce` can call the endpoint. The regular WooCommerce `woocommerce_order_refunded` hook also records a post-refund verification note so manual admin refunds are auditable.

## Development

```bash
composer install
composer test
composer lint
```

Without Composer dependencies, syntax can still be checked directly:

```bash
find . -name '*.php' -not -path './vendor/*' -print0 | xargs -0 -n1 php -l
```

## Validation checklist

- Configure a test API key in plugin settings.
- Place a test order with `X-Agent-ID` or `_aport_agent_id`.
- Confirm the order receives an APort order-verification note.
- Call `verify-refund` with a test amount and confirm the JSON decision.
- Create a WooCommerce refund and confirm a refund-verification order note is recorded.
