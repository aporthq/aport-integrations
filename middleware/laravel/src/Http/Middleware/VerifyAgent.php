<?php

namespace Aport\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Aport\Laravel\Services\AportClient;

class VerifyAgent
{
    public function __construct(protected AportClient $client) {}

    public function handle(Request $request, Closure $next)
    {
        if ($this->shouldSkip($request)) {
            return $next($request);
        }

        $agentId = $request->header('X-APort-Agent-Id') ?? $request->query('agent_id');

        if (!$agentId) {
            return response()->json(['error' => 'Agent ID required'], 401);
        }

        $result = $this->client->verifyAgent($agentId);

        if (!$result) {
            return response()->json(['error' => 'Agent verification failed'], 403);
        }

        $request->attributes->set('aport_agent', $result);

        return $next($request);
    }

    protected function shouldSkip(Request $request): bool
    {
        $skipPaths = config('aport.skip_paths', []);

        foreach ($skipPaths as $path) {
            if ($request->is($path)) {
                return true;
            }
        }

        return false;
    }
}
