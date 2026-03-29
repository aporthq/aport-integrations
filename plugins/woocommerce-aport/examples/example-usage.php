<?php
/**
 * Example usage of the APort WooCommerce plugin
 *
 * This file demonstrates how to use the plugin hooks and filters
 * in your theme or another plugin.
 */

// Example 1: Block refunds when APort verification fails
add_filter('aport_woocommerce_block_refund_on_failure', '__return_true');

// Example 2: Modify verification context with custom data
add_filter('aport_woocommerce_verification_context', function($context, $order) {
    $context['store_id'] = get_current_blog_id();
    $context['environment'] = wp_get_environment_type();
    return $context;
}, 10, 2);

// Example 3: Listen for successful order verification
add_action('aport_woocommerce_order_verified', function($agent_id, $order_id, $result) {
    // Log to your analytics system
    error_log(sprintf(
        'APort verified order #%d for agent %s',
        $order_id,
        $agent_id
    ));
}, 10, 3);

// Example 4: Handle verification failures
add_action('aport_woocommerce_verification_failed', function($agent_id, $order_id, $error) {
    // Notify admin
    wp_mail(
        get_option('admin_email'),
        'APort Verification Failed',
        sprintf(
            'Order #%d verification failed for agent %s: %s',
            $order_id,
            $agent_id,
            $error
        )
    );
}, 10, 3);

// Example 5: Custom policy based on order total
add_filter('aport_woocommerce_verification_policy', function($policy, $order) {
    if ($order->get_total() > 1000) {
        return 'high-value-order-policy';
    }
    return $policy;
}, 10, 2);
