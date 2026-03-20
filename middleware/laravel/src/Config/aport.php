<?php

return [
    'api_key' => env('APORT_API_KEY'),
    'base_url' => env('APORT_BASE_URL', 'https://api.aport.io'),
    'timeout' => (int) env('APORT_TIMEOUT', 5000),
    'fail_closed' => (bool) env('APORT_FAIL_CLOSED', true),
    'skip_paths' => array_filter(explode(',', env('APORT_SKIP_PATHS', '/health,/metrics'))),
    'default_policy_id' => env('APORT_DEFAULT_POLICY_ID'),
];
