<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class APortVerification
{
    /**
     * APort API configuration
     */
    protected $apiKey;
    protected $projectId;
    protected $enabled;
    protected $exemptRoutes;
    
    /**
     * Create a new middleware instance
     */
    public function __construct()
    {
        $this->apiKey = config('aport.api_key', env('APORT_API_KEY'));
        $this->projectId = config('aport.project_id', env('APORT_PROJECT_ID', 'default'));
        $this->enabled = config('aport.enabled', true);
        $this->exemptRoutes = config('aport.exempt_routes', []);
    }
    
    /**
     * Handle an incoming request
     */
    public function handle(Request $request, Closure $next)
    {
        // Skip if disabled
        if (!$this->enabled) {
            return $next($request);
        }
        
        // Skip exempt routes
        if ($this->isExempt($request)) {
            return $next($request);
        }
        
        // Skip admin routes
        if ($request->is('admin/*') || $request->is('login')) {
            return $next($request);
        }
        
        // Verify with APort
        $result = $this->verify($request);
        
        if (!($result['allow'] ?? true)) {
            return response()->json([
                'error' => 'Access Denied',
                'reasons' => $result['reasons'] ?? []
            ], 403);
        }
        
        return $next($request);
    }
    
    /**
     * Check if route is exempt
     */
    protected function isExempt(Request $request): bool
    {
        foreach ($this->exemptRoutes as $route) {
            if ($request->is($route)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Verify request with APort
     */
    protected function verify(Request $request): array
    {
        if (empty($this->apiKey)) {
            Log::warning('APort API key not configured, allowing request');
            return ['allow' => true, 'reasons' => ['No API key']];
        }
        
        $actor = $this->getActor($request);
        $context = $this->getContext($request);
        
        try {
            $client = new \GuzzleHttp\Client();
            
            $response = $client->post('https://api.aport.io/verify', [
                'json' => [
                    'action' => 'laravel_' . strtolower($request->method()),
                    'actor' => $actor,
                    'context' => ['data' => $context],
                    'projectId' => $this->projectId
                ],
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->apiKey
                ],
                'timeout' => 5
            ]);
            
            if ($response->getStatusCode() === 200) {
                return json_decode($response->getBody()->getContents(), true);
            }
            
            Log::error('APort API error: ' . $response->getStatusCode());
            return ['allow' => true, 'reasons' => ['API error']];
            
        } catch (\Exception $e) {
            Log::error('APort verification error: ' . $e->getMessage());
            return ['allow' => true, 'reasons' => ['Verification failed']];
        }
    }
    
    /**
     * Get actor information
     */
    protected function getActor(Request $request): array
    {
        $user = $request->user();
        
        if ($user) {
            return [
                'id' => (string) $user->id,
                'name' => $user->name ?? $user->email ?? 'user',
                'owner' => 'laravel'
            ];
        }
        
        return [
            'id' => 'anonymous_' . $request->ip(),
            'name' => 'anonymous',
            'owner' => 'laravel'
        ];
    }
    
    /**
     * Get request context
     */
    protected function getContext(Request $request): array
    {
        return [
            'method' => $request->method(),
            'path' => $request->path(),
            'ip' => $request->ip(),
            'user_agent' => substr($request->userAgent() ?? '', 0, 200)
        ];
    }
}
