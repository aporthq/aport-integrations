<?php

namespace Aport\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Aport\Laravel\Services\AportClient;

class VerifyAgentOrGuest
{
    public function __construct(protected AportClient $client) {}

    public function handle(Request $request, Closure $next)
    {
        $agentId = $request->header('X-APort-Agent-Id') ?? $request->query('agent_id');

        if (!$agentId) {
            $request->attributes->set('aport_agent', null);
            return $next($request);
        }

        $result = $this->client->verifyAgent($agentId);
        $request->attributes->set('aport_agent', $result);

        return $next($request);
    }
}
