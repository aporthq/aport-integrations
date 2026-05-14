<?php
/**
 * Plugin Name: APort WooCommerce Guardrail
 * Description: Verifies WooCommerce order and refund actions with APort policy checks.
 * Version: 0.1.0
 * Author: APort Community
 * License: MIT
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * WC requires at least: 8.0
 *
 * @package APortWooCommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

define('APORT_WOOCOMMERCE_VERSION', '0.1.0');
define('APORT_WOOCOMMERCE_PATH', plugin_dir_path(__FILE__));

require_once APORT_WOOCOMMERCE_PATH . 'includes/class-aport-woocommerce-client.php';
require_once APORT_WOOCOMMERCE_PATH . 'includes/class-aport-woocommerce.php';

add_action('plugins_loaded', static function () {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', static function () {
            echo '<div class="notice notice-warning"><p>';
            echo esc_html__('APort WooCommerce Guardrail requires WooCommerce to be active.', 'aport-woocommerce');
            echo '</p></div>';
        });
        return;
    }

    APort_WooCommerce::instance()->init();
});
