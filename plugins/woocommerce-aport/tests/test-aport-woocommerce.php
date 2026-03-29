<?php
/**
 * PHPUnit tests for APort WooCommerce Verification Plugin
 */

namespace APort\WooCommerce;

use PHPUnit\Framework\TestCase;

class APort_WooCommerce_Test extends TestCase
{
    /**
     * Test plugin constants are defined
     */
    public function test_plugin_version_defined()
    {
        $this->assertEquals('1.0.0', APort_WooCommerce::VERSION);
    }

    /**
     * Test API base URL constant
     */
    public function test_api_base_url_defined()
    {
        $this->assertEquals('https://api.aport.io', APort_WooCommerce::API_BASE_URL);
    }

    /**
     * Test get_instance returns singleton
     */
    public function test_get_instance_returns_singleton()
    {
        $instance1 = APort_WooCommerce::get_instance();
        $instance2 = APort_WooCommerce::get_instance();
        $this->assertSame($instance1, $instance2);
    }

    /**
     * Test plugin can be instantiated
     */
    public function test_plugin_instantiable()
    {
        $instance = APort_WooCommerce::get_instance();
        $this->assertInstanceOf(APort_WooCommerce::class, $instance);
    }
}
