<?php

namespace Aport\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Aport\Laravel\Services\AportClient;

class EnforcePolicy
{
    public function __construct(private AportClient $client) {}

    public function handle(Request $request, Closure $next, string $policyId)
    {
        $agentId = $request->header('X-Agent-Passport-Id')
            ?? $request->header('X-Agent-Id');

        if (!$agentId) {
            return response()->json([
                'error' => 'missing_agent_id',
                'message' => 'Agent ID is required.',
            ], 401);
        }

        try {
            $context = $request->except(['passport', 'policy']);
            $decision = $this->client->verifyPolicy($agentId, $policyId, $context);

            if (!$decision['allow']) {
                return response()->json([
                    'error' => 'policy_violation',
                    'message' => 'Policy violation',
                    'agent_id' => $agentId,
                    'policy_id' => $policyId,
                    'decision_id' => $decision['decision_id'] ?? null,
                    'reasons' => $decision['reasons'] ?? [],
                ], 403);
            }

            $request->attributes->set('policy_result', $decision);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'api_error',
                'message' => $e->getMessage(),
            ], 500);
        }

        return $next($request);
    }
}
