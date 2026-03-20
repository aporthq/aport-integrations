<?php

return [
    /*
    | APort API key
    */
    'api_key' => env('APORT_API_KEY', ''),

    /*
    | API base URL
    */
    'base_url' => env('APORT_BASE_URL', 'https://api.aport.io'),

    /*
    | HTTP request timeout (seconds)
    */
    'timeout' => (int) env('APORT_TIMEOUT', 10),

    /*
    | Paths to skip middleware (supports wildcards via request->is())
    */
    'skip_paths' => [
        // 'api/health',
        // 'api/public/*',
    ],

    /*
    | Fail closed: when true, API errors block the request.
    | When false, API errors allow the request through.
    */
    'fail_closed' => (bool) env('APORT_FAIL_CLOSED', true),
];
