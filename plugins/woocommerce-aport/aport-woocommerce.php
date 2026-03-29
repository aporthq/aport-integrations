<?php
/**
 * Plugin Name: APort WooCommerce Verification
 * Plugin URI: https://github.com/aporthq/aport-integrations/tree/main/plugins/woocommerce-aport
 * Description: Integrate APort agent identity verification with WooCommerce orders and refunds
 * Version: 1.0.0
 * Author: APort Community
 * Author URI: https://aport.io
 * License: MIT
 * Text Domain: aport-woocommerce
 * Requires at least: 6.0
 * Requires PHP: 7.4
 *
 * @package APort\WooCommerce
 */

// Load the main plugin class if not already loaded
if (!class_exists('APort\WooCommerce\APort_WooCommerce')) {
    require_once __DIR__ . '/src/class-aport-woocommerce.php';
}
