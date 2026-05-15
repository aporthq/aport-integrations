<?php

return [
    'api_key' => env('APORT_API_KEY'),

    'base_url' => env('APORT_BASE_URL', 'https://api.aport.io'),

    'default_policy' => env('APORT_DEFAULT_POLICY', 'finance.payment.refund.v1'),

    'timeout' => (int) env('APORT_TIMEOUT', 5),

    'fail_open' => (bool) env('APORT_FAIL_OPEN', false),

    'context' => [
        'service' => env('APP_NAME', 'laravel'),
    ],
];
