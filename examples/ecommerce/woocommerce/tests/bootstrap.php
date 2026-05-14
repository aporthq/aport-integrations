<?php

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__);
}

function __($text)
{
    return $text;
}

function esc_html__($text)
{
    return $text;
}

require_once __DIR__ . '/../includes/class-aport-woocommerce.php';
