<?php
/**
 * WooCommerce integration.
 *
 * @package APortWooCommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

class APort_WooCommerce
{
    const OPTION_KEY = 'aport_woocommerce_options';
    const ORDER_POLICY = 'commerce.order.v1';
    const REFUND_POLICY = 'payments.refund.v1';

    private static $instance;

    public static function instance()
    {
        if (!self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function init()
    {
        add_action('admin_menu', array($this, 'register_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('woocommerce_checkout_order_processed', array($this, 'verify_checkout_order'), 20, 3);
        add_action('woocommerce_order_refunded', array($this, 'verify_refund'), 20, 2);
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function register_settings_page()
    {
        add_options_page(
            'APort WooCommerce',
            'APort WooCommerce',
            'manage_options',
            'aport-woocommerce',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings()
    {
        register_setting('aport_woocommerce', self::OPTION_KEY, array($this, 'sanitize_options'));

        add_settings_section('aport_woocommerce_main', 'APort settings', '__return_false', 'aport_woocommerce');

        $fields = array(
            'api_key' => 'API key',
            'base_url' => 'Base URL',
            'order_policy' => 'Order policy id',
            'refund_policy' => 'Refund policy id',
            'block_refunds' => 'Flag denied refunds',
        );

        foreach ($fields as $field => $label) {
            add_settings_field($field, $label, array($this, 'render_field'), 'aport_woocommerce', 'aport_woocommerce_main', array('field' => $field));
        }
    }

    public function sanitize_options($options)
    {
        $options = is_array($options) ? $options : array();

        return array(
            'api_key' => sanitize_text_field($options['api_key'] ?? ''),
            'base_url' => esc_url_raw($options['base_url'] ?? 'https://api.aport.io'),
            'order_policy' => sanitize_text_field($options['order_policy'] ?? self::ORDER_POLICY),
            'refund_policy' => sanitize_text_field($options['refund_policy'] ?? self::REFUND_POLICY),
            'block_refunds' => !empty($options['block_refunds']) ? '1' : '0',
        );
    }

    public function render_field($args)
    {
        $field = $args['field'];
        $options = $this->get_options();
        $name = self::OPTION_KEY . '[' . esc_attr($field) . ']';

        if ($field === 'block_refunds') {
            printf(
                '<label><input type="checkbox" name="%s" value="1" %s> %s</label>',
                esc_attr($name),
                checked($options[$field], '1', false),
                esc_html__('Add a manual-review order note when a refund verification is denied.', 'aport-woocommerce')
            );
            return;
        }

        $type = $field === 'api_key' ? 'password' : 'text';
        printf(
            '<input type="%s" class="regular-text" name="%s" value="%s">',
            esc_attr($type),
            esc_attr($name),
            esc_attr($options[$field])
        );
    }

    public function render_settings_page()
    {
        echo '<div class="wrap"><h1>APort WooCommerce Guardrail</h1>';
        echo '<form method="post" action="options.php">';
        settings_fields('aport_woocommerce');
        do_settings_sections('aport_woocommerce');
        submit_button();
        echo '</form></div>';
    }

    public function verify_checkout_order($order_id, $posted_data, $order)
    {
        if (!$order && function_exists('wc_get_order')) {
            $order = wc_get_order($order_id);
        }

        if (!$order) {
            return;
        }

        $agent_id = self::extract_agent_id($_SERVER, $order);
        $context = self::build_order_context($order, 'order.created');
        $this->record_verification($order, $agent_id, $this->get_options()['order_policy'], $context);
    }

    public function verify_refund($order_id, $refund_id)
    {
        if (!function_exists('wc_get_order')) {
            return;
        }

        $order = wc_get_order($order_id);
        $refund = wc_get_order($refund_id);

        if (!$order || !$refund) {
            return;
        }

        $agent_id = self::extract_agent_id($_SERVER, $order);
        $context = self::build_refund_context($order, $refund);
        $this->record_verification($order, $agent_id, $this->get_options()['refund_policy'], $context);
    }

    public function register_rest_routes()
    {
        register_rest_route(
            'aport-woocommerce/v1',
            '/verify-refund',
            array(
                'methods' => 'POST',
                'callback' => array($this, 'rest_verify_refund'),
                'permission_callback' => function () {
                    return current_user_can('manage_woocommerce');
                },
            )
        );
    }

    public function rest_verify_refund(WP_REST_Request $request)
    {
        $order_id = absint($request->get_param('order_id'));
        $amount = (float) $request->get_param('amount');
        $agent_id = sanitize_text_field($request->get_param('agent_id'));

        if (!function_exists('wc_get_order')) {
            return new WP_Error('woocommerce_missing', 'WooCommerce is required.', array('status' => 500));
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('order_not_found', 'Order not found.', array('status' => 404));
        }

        $context = self::build_order_context($order, 'refund.requested');
        $context['refund'] = array(
            'amount' => $amount,
            'currency' => method_exists($order, 'get_currency') ? $order->get_currency() : '',
        );

        $result = $this->record_verification($order, $agent_id, $this->get_options()['refund_policy'], $context);

        if (is_wp_error($result)) {
            return $result;
        }

        return rest_ensure_response($result);
    }

    public static function extract_agent_id(array $server, $order = null)
    {
        $candidates = array(
            $server['HTTP_X_AGENT_ID'] ?? '',
            $server['HTTP_X_APORT_AGENT_ID'] ?? '',
        );

        if ($order && method_exists($order, 'get_meta')) {
            $candidates[] = $order->get_meta('_aport_agent_id');
        }

        foreach ($candidates as $candidate) {
            $candidate = trim((string) $candidate);
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return '';
    }

    public static function build_order_context($order, $action)
    {
        return array(
            'action' => $action,
            'platform' => 'woocommerce',
            'order' => array(
                'id' => self::call($order, 'get_id'),
                'number' => self::call($order, 'get_order_number'),
                'status' => self::call($order, 'get_status'),
                'total' => (float) self::call($order, 'get_total'),
                'currency' => self::call($order, 'get_currency'),
                'customer_id' => self::call($order, 'get_customer_id'),
            ),
        );
    }

    public static function build_refund_context($order, $refund)
    {
        $context = self::build_order_context($order, 'refund.created');
        $context['refund'] = array(
            'id' => self::call($refund, 'get_id'),
            'amount' => abs((float) self::call($refund, 'get_amount')),
            'reason' => self::call($refund, 'get_reason'),
            'currency' => self::call($order, 'get_currency'),
        );

        return $context;
    }

    private function record_verification($order, $agent_id, $policy_id, array $context)
    {
        $client = $this->client();
        $result = $client->verify($policy_id, $agent_id, $context);

        if (is_wp_error($result)) {
            $this->add_order_note($order, 'APort verification error: ' . $result->get_error_message());
            return $result;
        }

        $message = sprintf(
            'APort verification %s for policy %s%s.',
            $result['allowed'] ? 'allowed' : 'denied',
            $policy_id,
            $result['reason'] !== '' ? ': ' . $result['reason'] : ''
        );

        $this->add_order_note($order, $message);

        $options = $this->get_options();
        if (!$result['allowed'] && $policy_id === $options['refund_policy'] && $options['block_refunds'] === '1') {
            $this->add_order_note($order, 'APort refund verification was denied. Review this refund before any additional fulfillment or reimbursement.');
        }

        if (method_exists($order, 'update_meta_data')) {
            $order->update_meta_data('_aport_last_decision', $result['decision']);
            $order->update_meta_data('_aport_last_policy', $policy_id);
            $order->update_meta_data('_aport_last_agent_id', $agent_id);
            $order->save();
        }

        return $result;
    }

    private function add_order_note($order, $message)
    {
        if (method_exists($order, 'add_order_note')) {
            $order->add_order_note($message, false, true);
        }
    }

    private function client()
    {
        $options = $this->get_options();

        return new APort_WooCommerce_Client($options['api_key'], $options['base_url']);
    }

    private function get_options()
    {
        $options = function_exists('get_option') ? get_option(self::OPTION_KEY, array()) : array();
        $options = is_array($options) ? $options : array();

        return array_merge(
            array(
                'api_key' => '',
                'base_url' => 'https://api.aport.io',
                'order_policy' => self::ORDER_POLICY,
                'refund_policy' => self::REFUND_POLICY,
                'block_refunds' => '1',
            ),
            $options
        );
    }

    private static function call($object, $method)
    {
        return is_object($object) && method_exists($object, $method) ? $object->{$method}() : null;
    }
}
