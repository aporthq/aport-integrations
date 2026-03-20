<?php

namespace Aport\Laravel\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;

class AportClient
{
    protected Client $http;

    public function __construct()
    {
        $this->http = new Client([
            'base_uri' => config('aport.base_url', 'https://api.aport.io'),
            'timeout'  => config('aport.timeout', 10),
            'headers'  => [
                'Authorization' => 'Bearer ' . config('aport.api_key'),
                'Accept'        => 'application/json',
            ],
        ]);
    }

    public function verifyAgent(string $agentId): ?array
    {
        try {
            $response = $this->http->post('/api/agents/verify', [
                'json' => ['agent_id' => $agentId],
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            Log::error('APort agent verification failed', [
                'agent_id' => $agentId,
                'error'    => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function verifyPolicy(string $policyId, string $agentId): ?array
    {
        try {
            $response = $this->http->post("/api/verify/policy/{$policyId}", [
                'json' => ['agent_id' => $agentId],
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            Log::error('APort policy verification failed', [
                'policy_id' => $policyId,
                'agent_id'  => $agentId,
                'error'     => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function getPassportView(string $agentId): ?array
    {
        try {
            $response = $this->http->get("/api/passport/{$agentId}");
            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            Log::error('APort passport fetch failed', [
                'agent_id' => $agentId,
                'error'    => $e->getMessage(),
            ]);
            return null;
        }
    }
}
