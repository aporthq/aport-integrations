<?php

/*
 * APort Configuration
 * 
 * Copy this file to config/aport.php
 */

return [
    /*
     * APort API Key
     */
    'api_key' => env('APORT_API_KEY', ''),
    
    /*
     * APort Project ID
     */
    'project_id' => env('APORT_PROJECT_ID', 'default'),
    
    /*
     * Enable/disable verification
     */
    'enabled' => env('APORT_ENABLED', true),
    
    /*
     * Routes to exempt from verification
     */
    'exempt_routes' => [
        'health',
        'api/public',
    ],
    
    /*
     * Verification timeout (seconds)
     */
    'timeout' => 5,
];
