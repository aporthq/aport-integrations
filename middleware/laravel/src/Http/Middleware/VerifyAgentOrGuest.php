<?php

namespace Aport\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Aport\Laravel\Services\AportClient;

class VerifyAgentOrGuest
{
    public function __construct(private AportClient $client) {}

    public function handle(Request $request, Closure $next)
    {
        $agentId = $request->header('X-Agent-Passport-Id')
            ?? $request->header('X-Agent-Id');

        if ($agentId) {
            try {
                $passport = $this->client->getPassportView($agentId);
                $request->attributes->set('agent', ['agent_id' => $agentId, ...$passport]);
            } catch (\Exception $e) {
                // Fail open - continue without agent
            }
        }

        return $next($request);
    }
}
