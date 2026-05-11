<?php

return [
    'api_key' => env('APORT_API_KEY'),
    'base_url' => env('APORT_BASE_URL', 'https://aport.io'),
    'timeout' => (float) env('APORT_TIMEOUT', 5.0),
    'default_policy' => env('APORT_DEFAULT_POLICY', 'code.repository.merge.v1'),
    'fail_open' => (bool) env('APORT_FAIL_OPEN', false),
    'agent_headers' => [
        'X-APort-Agent-ID',
        'X-Agent-ID',
    ],
];
