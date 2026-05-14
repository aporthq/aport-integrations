<?php

use PHPUnit\Framework\TestCase;

final class VerificationContextTest extends TestCase
{
    public function testExtractAgentIdPrefersHeader()
    {
        $order = new FakeOrder();
        $order->meta['_aport_agent_id'] = 'order-agent';

        $this->assertSame(
            'header-agent',
            APort_WooCommerce::extract_agent_id(array('HTTP_X_AGENT_ID' => ' header-agent '), $order)
        );
    }

    public function testExtractAgentIdFallsBackToOrderMeta()
    {
        $order = new FakeOrder();
        $order->meta['_aport_agent_id'] = 'order-agent';

        $this->assertSame('order-agent', APort_WooCommerce::extract_agent_id(array(), $order));
    }

    public function testBuildOrderContext()
    {
        $context = APort_WooCommerce::build_order_context(new FakeOrder(), 'order.created');

        $this->assertSame('order.created', $context['action']);
        $this->assertSame('woocommerce', $context['platform']);
        $this->assertSame(42, $context['order']['id']);
        $this->assertSame(125.5, $context['order']['total']);
        $this->assertSame('USD', $context['order']['currency']);
    }

    public function testBuildRefundContext()
    {
        $context = APort_WooCommerce::build_refund_context(new FakeOrder(), new FakeRefund());

        $this->assertSame('refund.created', $context['action']);
        $this->assertSame(77, $context['refund']['id']);
        $this->assertSame(15.25, $context['refund']['amount']);
        $this->assertSame('Customer request', $context['refund']['reason']);
    }
}

final class FakeOrder
{
    public $meta = array();

    public function get_id()
    {
        return 42;
    }

    public function get_order_number()
    {
        return '100042';
    }

    public function get_status()
    {
        return 'processing';
    }

    public function get_total()
    {
        return '125.50';
    }

    public function get_currency()
    {
        return 'USD';
    }

    public function get_customer_id()
    {
        return 12;
    }

    public function get_meta($key)
    {
        return $this->meta[$key] ?? '';
    }
}

final class FakeRefund
{
    public function get_id()
    {
        return 77;
    }

    public function get_amount()
    {
        return '-15.25';
    }

    public function get_reason()
    {
        return 'Customer request';
    }
}
