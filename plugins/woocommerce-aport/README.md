# APort WooCommerce Verification Plugin

Integrate APort agent identity verification with WooCommerce orders and refunds.

## Overview

This WordPress plugin adds APort verification to your WooCommerce store. It can verify agent identities when:
- New orders are placed via REST API
- Orders are completed
- Refunds are created

## Installation

### Manual Installation

1. Download or clone this repository
2. Copy the `woocommerce-aport` folder to your WordPress plugins directory (`wp-content/plugins/`)
3. Activate the plugin through the WordPress admin
4. Go to **Settings > APort WooCommerce** to configure

### Via Composer

```bash
composer require aport/woocommerce-aport
```

## Configuration

After activation, go to **Settings > APort WooCommerce** and configure:

| Setting | Description |
|---------|-------------|
| API Key | Your APort API key from [aport.io/dashboard](https://aport.io/dashboard) |
| Base URL | APort API endpoint (default: `https://api.aport.io`) |
| Refund Policy ID | APort policy for refund verification |
| Order Policy ID | APort policy for order verification |
| Verify on Order Creation | Enable verification when orders are placed |
| Verify on Refund Creation | Enable verification when refunds are created |

## Usage

### Setting Agent ID on Orders

When creating orders via WooCommerce REST API, include the agent ID:

```bash
curl -X POST https://yoursite.com/wp-json/wc/v3/orders \
  -u consumer_key:consumer_secret \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: agent_123456" \
  -d '{
    "payment_method": "bacs",
    "billing_address": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "line_items": [
      {"product_id": 123, "quantity": 2}
    ]
  }'
```

### Webhook Endpoint

The plugin exposes a webhook endpoint at:

```
POST /wp-json/aport-woocommerce/v1/webhook
```

Use this to receive APort events like suspension or policy changes.

### Verification Logs

View verification logs in the plugin settings page under the **Verification Logs** tab.

## Hooks & Filters

### Actions

- `aport_woocommerce_order_verified` - Fired after successful order verification
- `aport_woocommerce_refund_verified` - Fired after successful refund verification
- `aport_woocommerce_verification_failed` - Fired when verification fails

### Filters

- `aport_woocommerce_block_refund_on_failure` - Set to `true` to block refunds when APort verification fails
- `aport_woocommerce_verification_context` - Modify the context sent to APort

## Example

```php
// Block refunds when APort verification fails
add_filter('aport_woocommerce_block_refund_on_failure', '__return_true');

// Modify verification context
add_filter('aport_woocommerce_verification_context', function($context, $order) {
    $context['customer_tier'] = get_user_meta($order->get_user_id(), 'customer_tier', true);
    return $context;
}, 10, 2);
```

## Requirements

- WordPress 6.0+
- PHP 7.4+
- WooCommerce 8.0+
- APort account (free at [aport.io](https://aport.io))

## License

MIT
