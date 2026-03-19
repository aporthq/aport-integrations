<?php
/**
 * Plugin Name: APort WooCommerce Verification
 * Description: Verify orders and refunds with APort AI security
 * Version: 1.0.0
 * Author: APort Team
 * Author URI: https://aport.io
 * License: MIT
 * Text Domain: aport-woocommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define constants
define('APORT_WC_VERSION', '1.0.0');
define('APORT_WC_PLUGIN_FILE', __FILE__);

/**
 * Main APort WooCommerce Plugin Class
 */
class APort_WooCommerce_Verification {

    private static $instance = null;
    private $api_key;
    private $project_id;
    private $enabled;

    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->api_key = get_option('aport_wc_api_key', '');
        $this->project_id = get_option('aport_wc_project_id', 'default');
        $this->enabled = get_option('aport_wc_enabled', 'yes');

        // Hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('woocommerce_order_status_changed', array($this, 'verify_order_status'), 10, 4);
        add_action('woocommerce_order_created', array($this, 'verify_new_order'));
        add_filter('woocommerce_order_data_store', array($this, 'override_order_data'), 99);
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'APort Verification',
            'APort Verification',
            'manage_options',
            'aport-woocommerce',
            array($this, 'admin_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('aport_wc_settings', 'aport_wc_api_key');
        register_setting('aport_wc_settings', 'aport_wc_project_id');
        register_setting('aport_wc_settings', 'aport_wc_enabled');
    }

    /**
     * Admin page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>APort WooCommerce Verification</h1>
            <form method="post" action="options.php">
                <?php settings_fields('aport_wc_settings'); ?>
                <?php do_settings_sections('aport_wc_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th>Enable Verification</th>
                        <td>
                            <input type="checkbox" name="aport_wc_enabled" value="yes" 
                                <?php checked(get_option('aport_wc_enabled'), 'yes'); ?>>
                            <span class="description">Enable APort verification</span>
                        </td>
                    </tr>
                    <tr>
                        <th>API Key</th>
                        <td>
                            <input type="text" name="aport_wc_api_key" 
                                value="<?php echo esc_attr(get_option('aport_wc_api_key')); ?>" 
                                class="regular-text">
                        </td>
                    </tr>
                    <tr>
                        <th>Project ID</th>
                        <td>
                            <input type="text" name="aport_wc_project_id" 
                                value="<?php echo esc_attr(get_option('aport_wc_project_id', 'default')); ?>" 
                                class="regular-text">
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    /**
     * Verify with APort
     */
    private function verify($action, $actor_id, $actor_name, $context) {
        if ($this->enabled !== 'yes' || empty($this->api_key)) {
            return array('allow' => true, 'reasons' => array('Disabled or no API key'));
        }

        $body = wp_json_encode(array(
            'action' => $action,
            'actor' => array(
                'id' => $actor_id,
                'name' => $actor_name,
                'owner' => 'woocommerce'
            ),
            'context' => array('data' => $context),
            'projectId' => $this->project_id
        ));

        $response = wp_remote_post('https://api.aport.io/verify', array(
            'body' => $body,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->api_key
            ),
            'timeout' => 15
        ));

        if (is_wp_error($response)) {
            return array('allow' => true, 'reasons' => array('API error: ' . $response->get_error_message()));
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data ?: array('allow' => true, 'reasons' => array('Parse error'));
    }

    /**
     * Verify new order
     */
    public function verify_new_order($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;

        $result = $this->verify(
            'woocommerce_order_created',
            $order->get_customer_id() ?: 'guest',
            $order->get_billing_email() ?: 'guest',
            array(
                'order_id' => $order_id,
                'total' => $order->get_total(),
                'currency' => $order->get_currency()
            )
        );

        if (!($result['allow'] ?? true)) {
            $order->add_order_note('APort blocked: ' . implode(', ', $result['reasons'] ?? array()));
            // Optionally cancel order
            // $order->update_status('cancelled', 'APort verification failed');
        }
    }

    /**
     * Verify order status change
     */
    public function verify_order_status($order_id, $old_status, $new_status, $order) {
        if ($new_status === 'refunded') {
            $result = $this->verify(
                'woocommerce_order_refunded',
                $order->get_customer_id() ?: 'system',
                $order->get_billing_email() ?: 'system',
                array(
                    'order_id' => $order_id,
                    'refund_amount' => $order->get_total(),
                    'old_status' => $old_status,
                    'new_status' => $new_status
                )
            );

            if (!($result['allow'] ?? true)) {
                $order->add_order_note('APort refund blocked: ' . implode(', ', $result['reasons'] ?? array()));
            }
        }
    }

    /**
     * Override order data
     */
    public function override_order_data($data_store) {
        // Add custom verification logic here if needed
        return $data_store;
    }
}

// Initialize
function APort_WooCommerce() {
    return APort_WooCommerce_Verification::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'APort_WooCommerce');
