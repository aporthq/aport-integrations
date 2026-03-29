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
 */

namespace APort\WooCommerce;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main plugin class for APort WooCommerce Verification
 */
class APort_WooCommerce
{
    /**
     * Plugin version
     */
    const VERSION = '1.0.0';

    /**
     * APort API base URL
     */
    const API_BASE_URL = 'https://api.aport.io';

    /**
     * Singleton instance
     *
     * @var APort_WooCommerce|null
     */
    private static $instance = null;

    /**
     * API key for APort
     *
     * @var string|null
     */
    private $api_key;

    /**
     * Base URL for APort API
     *
     * @var string
     */
    private $base_url;

    /**
     * Get singleton instance
     *
     * @return APort_WooCommerce
     */
    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->api_key = get_option('aport_woocommerce_api_key', '');
        $this->base_url = get_option('aport_woocommerce_base_url', self::API_BASE_URL);

        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('woocommerce_order_status_completed', array($this, 'verify_order_completion'), 10, 1);
        add_action('woocommerce_order_refund_created', array($this, 'verify_refund_creation'), 10, 2);
        add_filter('woocommerce_rest_pre_insert_shop_order_object', array($this, 'verify_order_creation'), 10, 2);
    }

    /**
     * Initialize the plugin
     */
    public function init()
    {
        $this->load_plugin_textdomain();
        $this->register_webhook();
    }

    /**
     * Load plugin text domain for translations
     */
    public function load_plugin_textdomain()
    {
        load_plugin_textdomain(
            'aport-woocommerce',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages/'
        );
    }

    /**
     * Register settings for the plugin
     */
    public function register_settings()
    {
        register_setting('aport_woocommerce_settings', 'aport_woocommerce_api_key', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '',
        ));

        register_setting('aport_woocommerce_settings', 'aport_woocommerce_base_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => self::API_BASE_URL,
        ));

        register_setting('aport_woocommerce_settings', 'aport_woocommerce_policy_refund', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'refund-policy',
        ));

        register_setting('aport_woocommerce_settings', 'aport_woocommerce_policy_order', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'order-policy',
        ));

        register_setting('aport_woocommerce_settings', 'aport_woocommerce_verify_on_order', array(
            'type' => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default' => true,
        ));

        register_setting('aport_woocommerce_settings', 'aport_woocommerce_verify_on_refund', array(
            'type' => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default' => true,
        ));

        add_settings_section(
            'aport_woocommerce_main',
            __('APort Configuration', 'aport-woocommerce'),
            array($this, 'settings_section_callback'),
            'aport_woocommerce'
        );

        add_settings_field(
            'aport_woocommerce_api_key',
            __('API Key', 'aport-woocommerce'),
            array($this, 'api_key_render'),
            'aport_woocommerce',
            'aport_woocommerce_main'
        );

        add_settings_field(
            'aport_woocommerce_base_url',
            __('Base URL', 'aport-woocommerce'),
            array($this, 'base_url_render'),
            'aport_woocommerce',
            'aport_woocommerce_main'
        );

        add_settings_field(
            'aport_woocommerce_policy_refund',
            __('Refund Policy ID', 'aport-woocommerce'),
            array($this, 'policy_refund_render'),
            'aport_woocommerce',
            'aport_woocommerce_main'
        );

        add_settings_field(
            'aport_woocommerce_policy_order',
            __('Order Policy ID', 'aport-woocommerce'),
            array($this, 'policy_order_render'),
            'aport_woocommerce',
            'aport_woocommerce_main'
        );

        add_settings_field(
            'aport_woocommerce_verify_on_order',
            __('Verify on Order Creation', 'aport-woocommerce'),
            array($this, 'verify_on_order_render'),
            'aport_woocommerce',
            'aport_woocommerce_main'
        );

        add_settings_field(
            'aport_woocommerce_verify_on_refund',
            __('Verify on Refund Creation', 'aport-woocommerce'),
            array($this, 'verify_on_refund_render'),
            'aport_woocommerce',
            'aport_woocommerce_main'
        );
    }

    /**
     * Settings section description
     */
    public function settings_section_callback()
    {
        echo '<p>' . esc_html__('Configure APort verification for WooCommerce orders and refunds.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Render API key field
     */
    public function api_key_render()
    {
        $value = get_option('aport_woocommerce_api_key', '');
        echo '<input type="text" name="aport_woocommerce_api_key" value="' . esc_attr($value) . '" class="regular-text" placeholder="Enter your APort API key" />';
        echo '<p class="description">' . esc_html__('Get your API key from your APort dashboard.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Render base URL field
     */
    public function base_url_render()
    {
        $value = get_option('aport_woocommerce_base_url', self::API_BASE_URL);
        echo '<input type="url" name="aport_woocommerce_base_url" value="' . esc_attr($value) . '" class="regular-text" placeholder="' . esc_attr(self::API_BASE_URL) . '" />';
        echo '<p class="description">' . esc_html__('Leave empty to use the default APort API endpoint.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Render refund policy field
     */
    public function policy_refund_render()
    {
        $value = get_option('aport_woocommerce_policy_refund', 'refund-policy');
        echo '<input type="text" name="aport_woocommerce_policy_refund" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__('The APort policy ID for refund verification.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Render order policy field
     */
    public function policy_order_render()
    {
        $value = get_option('aport_woocommerce_policy_order', 'order-policy');
        echo '<input type="text" name="aport_woocommerce_policy_order" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__('The APort policy ID for order verification.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Render verify on order checkbox
     */
    public function verify_on_order_render()
    {
        $value = (bool) get_option('aport_woocommerce_verify_on_order', true);
        echo '<input type="checkbox" name="aport_woocommerce_verify_on_order" value="1" ' . checked($value, true, false) . ' />';
        echo '<p class="description">' . esc_html__('Enable APort verification when new orders are placed via REST API.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Render verify on refund checkbox
     */
    public function verify_on_refund_render()
    {
        $value = (bool) get_option('aport_woocommerce_verify_on_refund', true);
        echo '<input type="checkbox" name="aport_woocommerce_verify_on_refund" value="1" ' . checked($value, true, false) . ' />';
        echo '<p class="description">' . esc_html__('Enable APort verification when refunds are created.', 'aport-woocommerce') . '</p>';
    }

    /**
     * Add admin menu item
     */
    public function add_admin_menu()
    {
        add_options_page(
            __('APort WooCommerce', 'aport-woocommerce'),
            __('APort WooCommerce', 'aport-woocommerce'),
            'manage_options',
            'aport_woocommerce',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Render the settings page
     */
    public function render_settings_page()
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('APort WooCommerce Verification Settings', 'aport-woocommerce'); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('aport_woocommerce_settings');
                do_settings_sections('aport_woocommerce');
                submit_button();
                ?>
            </form>

            <hr />

            <h2><?php esc_html_e('Verification Logs', 'aport-woocommerce'); ?></h2>
            <?php $this->render_verification_logs(); ?>
        </div>
        <?php
    }

    /**
     * Render verification logs
     */
    private function render_verification_logs()
    {
        $logs = get_option('aport_woocommerce_logs', array());
        if (empty($logs)) {
            echo '<p>' . esc_html__('No verification logs yet.', 'aport-woocommerce') . '</p>';
            return;
        }

        $logs = array_slice(array_reverse($logs), 0, 20);
        echo '<table class="widefat">';
        echo '<thead><tr><th>' . esc_html__('Timestamp', 'aport-woocommerce') . '</th><th>' . esc_html__('Type', 'aport-woocommerce') . '</th><th>' . esc_html__('Agent ID', 'aport-woocommerce') . '</th><th>' . esc_html__('Result', 'aport-woocommerce') . '</th><th>' . esc_html__('Order ID', 'aport-woocommerce') . '</th></tr></thead>';
        echo '<tbody>';
        foreach ($logs as $log) {
            echo '<tr>';
            echo '<td>' . esc_html($log['timestamp']) . '</td>';
            echo '<td>' . esc_html($log['type']) . '</td>';
            echo '<td>' . esc_html($log['agent_id']) . '</td>';
            echo '<td>' . esc_html($log['result']) . '</td>';
            echo '<td>' . esc_html($log['order_id']) . '</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
    }

    /**
     * Register webhook for APort events
     */
    private function register_webhook()
    {
        // Register REST API endpoint for APort webhook
        add_action('rest_api_init', function () {
            register_rest_route('aport-woocommerce/v1', '/webhook', array(
                'methods' => 'POST',
                'callback' => array($this, 'handle_webhook'),
                'permission_callback' => '__return_true',
            ));
        });
    }

    /**
     * Handle incoming APort webhook
     *
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function handle_webhook(\WP_REST_Request $request)
    {
        $body = $request->get_json_params();
        $agent_id = sanitize_text_field($body['agent_id'] ?? '');
        $event = sanitize_text_field($body['event'] ?? '');
        $signature = sanitize_text_field($request->get_header('x-aport-signature') ?? '');

        // Verify webhook signature
        if (!$this->verify_webhook_signature($signature, $body)) {
            $this->log_verification('webhook', $agent_id, 'signature_failed', $event);
            return new \WP_REST_Response(array('error' => 'Invalid signature'), 401);
        }

        $this->log_verification('webhook', $agent_id, 'received:' . $event, $event);

        return new \WP_REST_Response(array('received' => true), 200);
    }

    /**
     * Verify webhook signature
     *
     * @param string $signature
     * @param array $body
     * @return bool
     */
    private function verify_webhook_signature($signature, $body)
    {
        if (empty($signature) || empty($this->api_key)) {
            return false;
        }
        $payload = json_encode($body);
        $expected = hash_hmac('sha256', $payload, $this->api_key);
        return hash_equals($expected, $signature);
    }

    /**
     * Verify order creation via REST API
     *
     * @param \WC_Order $order
     * @param \WP_REST_Request $request
     * @return \WC_Order|\WP_Error
     */
    public function verify_order_creation($order, $request)
    {
        if (!get_option('aport_woocommerce_verify_on_order', true)) {
            return $order;
        }

        if (empty($this->api_key)) {
            $this->log_verification('order_creation', 'no_api_key', 'skipped', $order->get_id());
            return $order;
        }

        $agent_id = $this->extract_agent_id_from_request($request);
        if (!$agent_id) {
            $this->log_verification('order_creation', 'no_agent_id', 'skipped', $order->get_id());
            return $order;
        }

        $policy = get_option('aport_woocommerce_policy_order', 'order-policy');
        $result = $this->verify_with_aport($policy, $agent_id, array(
            'order_id' => $order->get_id(),
            'total' => $order->get_total(),
            'currency' => $order->get_currency(),
            'customer_email' => $order->get_billing_email(),
        ));

        if (is_wp_error($result)) {
            // Log the failure but don't block the order
            $this->log_verification('order_creation', $agent_id, 'failed:' . $result->get_error_message(), $order->get_id());
        } else {
            $order->add_order_note(sprintf(
                __('APort verification passed for agent %s', 'aport-woocommerce'),
                $agent_id
            ));
            $this->log_verification('order_creation', $agent_id, 'passed', $order->get_id());
        }

        return $order;
    }

    /**
     * Verify order completion
     *
     * @param int $order_id
     */
    public function verify_order_completion($order_id)
    {
        if (!get_option('aport_woocommerce_verify_on_order', true)) {
            return;
        }

        if (empty($this->api_key)) {
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $agent_id = $order->get_meta('_aport_agent_id');
        if (!$agent_id) {
            return;
        }

        $policy = get_option('aport_woocommerce_policy_order', 'order-policy');
        $result = $this->verify_with_aport($policy, $agent_id, array(
            'order_id' => $order->get_id(),
            'total' => $order->get_total(),
            'status' => $order->get_status(),
        ));

        if (is_wp_error($result)) {
            $this->log_verification('order_completion', $agent_id, 'failed:' . $result->get_error_message(), $order_id);
        } else {
            $order->add_order_note(sprintf(
                __('APort order completion verification passed for agent %s', 'aport-woocommerce'),
                $agent_id
            ));
            $this->log_verification('order_completion', $agent_id, 'passed', $order_id);
        }
    }

    /**
     * Verify refund creation
     *
     * @param int $refund_id
     * @param array $args
     */
    public function verify_refund_creation($refund_id, $args)
    {
        if (!get_option('aport_woocommerce_verify_on_refund', true)) {
            return;
        }

        if (empty($this->api_key)) {
            return;
        }

        $order_id = isset($args['order_id']) ? $args['order_id'] : 0;
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $agent_id = $order->get_meta('_aport_agent_id');
        if (!$agent_id) {
            return;
        }

        $policy = get_option('aport_woocommerce_policy_refund', 'refund-policy');
        $result = $this->verify_with_aport($policy, $agent_id, array(
            'order_id' => $order_id,
            'refund_id' => $refund_id,
            'refund_amount' => isset($args['amount']) ? $args['amount'] : 0,
        ));

        if (is_wp_error($result)) {
            $this->log_verification('refund', $agent_id, 'failed:' . $result->get_error_message(), $order_id);
            // Optionally block the refund
            if (apply_filters('aport_woocommerce_block_refund_on_failure', false)) {
                throw new \Exception(sprintf(
                    __('APort verification failed: %s', 'aport-woocommerce'),
                    $result->get_error_message()
                ));
            }
        } else {
            $this->log_verification('refund', $agent_id, 'passed', $order_id);
        }
    }

    /**
     * Extract agent ID from REST request
     *
     * @param \WP_REST_Request $request
     * @return string|null
     */
    private function extract_agent_id_from_request($request)
    {
        // Check headers
        $agent_id = $request->get_header('x-agent-id');
        if ($agent_id) {
            return sanitize_text_field($agent_id);
        }

        $agent_id = $request->get_header('x-aport-agent-id');
        if ($agent_id) {
            return sanitize_text_field($agent_id);
        }

        // Check body
        $body = $request->get_json_params() ?: array();
        if (!empty($body['agent_id'])) {
            return sanitize_text_field($body['agent_id']);
        }
        if (!empty($body['agentId'])) {
            return sanitize_text_field($body['agentId']);
        }

        return null;
    }

    /**
     * Call APort verification API
     *
     * @param string $policy Policy ID
     * @param string $agent_id Agent ID
     * @param array $context Additional context
     * @return array|\WP_Error
     */
    private function verify_with_aport($policy, $agent_id, $context = array())
    {
        $url = trailingslashit($this->base_url) . 'verify';

        $body = array(
            'policy' => $policy,
            'agent_id' => $agent_id,
            'context' => array_merge($context, array(
                'source' => 'woocommerce',
                'plugin_version' => self::VERSION,
            )),
        );

        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->api_key,
            ),
            'body' => json_encode($body),
            'timeout' => 15,
        );

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code !== 200) {
            return new \WP_Error(
                'aport_verification_failed',
                isset($body['message']) ? $body['message'] : 'Verification failed',
                array('status' => $code)
            );
        }

        return $body;
    }

    /**
     * Log a verification event
     *
     * @param string $type Verification type
     * @param string $agent_id Agent ID
     * @param string $result Result
     * @param int|string $order_id Related order ID
     */
    private function log_verification($type, $agent_id, $result, $order_id)
    {
        $logs = get_option('aport_woocommerce_logs', array());
        $logs[] = array(
            'timestamp' => current_time('mysql'),
            'type' => $type,
            'agent_id' => $agent_id,
            'result' => $result,
            'order_id' => $order_id,
        );
        // Keep only last 100 logs
        if (count($logs) > 100) {
            $logs = array_slice($logs, -100);
        }
        update_option('aport_woocommerce_logs', $logs);
    }

    /**
     * Activation hook
     */
    public static function activate()
    {
        // Set default options
        add_option('aport_woocommerce_api_key', '');
        add_option('aport_woocommerce_base_url', self::API_BASE_URL);
        add_option('aport_woocommerce_policy_refund', 'refund-policy');
        add_option('aport_woocommerce_policy_order', 'order-policy');
        add_option('aport_woocommerce_verify_on_order', true);
        add_option('aport_woocommerce_verify_on_refund', true);
        add_option('aport_woocommerce_logs', array());

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Deactivation hook
     */
    public static function deactivate()
    {
        flush_rewrite_rules();
    }
}

// Activation and deactivation hooks
register_activation_hook(__FILE__, array(APort_WooCommerce::class, 'activate'));
register_deactivation_hook(__FILE__, array(APort_WooCommerce::class, 'deactivate'));

// Initialize plugin
add_action('plugins_loaded', array(APort_WooCommerce::class, 'get_instance'));
