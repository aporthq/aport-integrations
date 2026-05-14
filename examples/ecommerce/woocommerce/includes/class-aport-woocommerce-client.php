<?php
/**
 * APort API client wrapper.
 *
 * @package APortWooCommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

class APort_WooCommerce_Client
{
    private $api_key;
    private $base_url;

    public function __construct($api_key, $base_url = 'https://api.aport.io')
    {
        $this->api_key = trim((string) $api_key);
        $this->base_url = rtrim(trim((string) $base_url), '/');
    }

    public function verify($policy_id, $agent_id, array $context)
    {
        if ($this->api_key === '') {
            return new WP_Error('aport_missing_api_key', 'APort API key is not configured.');
        }

        if (trim((string) $agent_id) === '') {
            return new WP_Error('aport_missing_agent_id', 'Agent id is required for APort verification.');
        }

        $response = wp_remote_post(
            $this->base_url . '/v1/verify',
            array(
                'timeout' => 10,
                'headers' => array(
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ),
                'body' => wp_json_encode(
                    array(
                        'policy_id' => $policy_id,
                        'agent_id' => $agent_id,
                        'context' => $context,
                    )
                ),
            )
        );

        if (is_wp_error($response)) {
            return $response;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        $body = json_decode((string) wp_remote_retrieve_body($response), true);
        if (!is_array($body)) {
            $body = array();
        }

        if ($status < 200 || $status >= 300) {
            return new WP_Error(
                'aport_http_error',
                sprintf('APort verification failed with HTTP %d.', $status),
                array('status' => $status, 'body' => $body)
            );
        }

        $allowed = isset($body['allowed']) ? (bool) $body['allowed'] : (isset($body['decision']) && $body['decision'] === 'allow');

        return array(
            'allowed' => $allowed,
            'decision' => isset($body['decision']) ? (string) $body['decision'] : ($allowed ? 'allow' : 'deny'),
            'reason' => isset($body['reason']) ? (string) $body['reason'] : '',
            'raw' => $body,
        );
    }
}
