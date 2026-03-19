# APort WooCommerce Verification Plugin

WordPress plugin for WooCommerce order and refund verification using APort.

## What It Does

- Verifies new orders with APort
- Blocks suspicious refunds
- Admin interface for configuration

## Installation

1. Upload `aport-woocommerce.php` to `/wp-content/plugins/`
2. Activate in WordPress Admin
3. Go to WooCommerce → APort Verification

## Configuration

1. Enter your APort API key
2. Set Project ID (default: default)
3. Enable verification

## Features

### Order Verification
- Automatically verifies new orders
- Can cancel flagged orders

### Refund Verification
- Blocks suspicious refunds
- Logs denial reasons

### Admin Interface
- Easy configuration
- Enable/disable toggle

## Usage

Once configured, the plugin automatically verifies:
- New orders
- Refunds

## Settings

| Setting | Description |
|---------|-------------|
| Enable | Turn verification on/off |
| API Key | Your APort API key |
| Project ID | Your project (default: default) |

## Development

```bash
# Test locally with WP CLI
wp plugin install woocommerce --activate
wp plugin activate aport-woocommerce
```

## License

MIT
