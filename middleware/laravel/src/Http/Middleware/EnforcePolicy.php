<?php

namespace Aport\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Aport\Laravel\Services\AportClient;

class EnforcePolicy
{
    public function __construct(protected AportClient $client) {}

    public function handle(Request $request, Closure $next, string $policyId)
    {
        $agentId = $request->header('X-APort-Agent-Id')
            ?? $request->query('agent_id')
            ?? $request->attributes->get('aport_agent.id');

        if (!$agentId) {
            return response()->json(['error' => 'Agent ID required'], 401);
        }

        $result = $this->client->verifyPolicy($policyId, $agentId);

        if (!$result) {
            return response()->json(['error' => 'Policy check failed'], 403);
        }

        $request->attributes->set('aport_policy', $result);

        return $next($request);
    }
}
