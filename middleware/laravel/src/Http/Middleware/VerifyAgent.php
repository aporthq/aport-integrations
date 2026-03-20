<?php

namespace Aport\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Aport\Laravel\Services\AportClient;

class VerifyAgent
{
    public function __construct(private AportClient $client) {}

    public function handle(Request $request, Closure $next)
    {
        $agentId = $request->header('X-Agent-Passport-Id')
            ?? $request->header('X-Agent-Id');

        if (!$agentId) {
            if (config('aport.fail_closed', true)) {
                return response()->json([
                    'error' => 'missing_agent_id',
                    'message' => 'Agent ID is required. Provide X-Agent-Passport-Id header.',
                ], 401);
            }
            return $next($request);
        }

        try {
            $passport = $this->client->getPassportView($agentId);
            $request->attributes->set('agent', ['agent_id' => $agentId, ...$passport]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'agent_verification_failed',
                'message' => $e->getMessage(),
                'agent_id' => $agentId,
            ], 401);
        }

        return $next($request);
    }
}
