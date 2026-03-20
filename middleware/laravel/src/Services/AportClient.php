<?php

namespace Aport\Laravel\Services;

use GuzzleHttp\Client;

class AportClient
{
    private Client $http;

    public function __construct(array $config = [])
    {
        $this->http = new Client([
            'base_uri' => $config['base_url'] ?? 'https://api.aport.io',
            'timeout' => ($config['timeout'] ?? 5000) / 1000,
            'headers' => array_filter([
                'Authorization' => isset($config['api_key']) ? "Bearer {$config['api_key']}" : null,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]),
        ]);
    }

    public function verifyPolicy(string $agentId, string $policyId, array $context = []): array
    {
        $response = $this->http->post("/api/verify/policy/{$policyId}", [
            'json' => array_filter([
                'context' => $context,
            ]),
            'headers' => ['X-Agent-Id' => $agentId],
        ]);
        return json_decode($response->getBody()->getContents(), true);
    }

    public function getPassportView(string $agentId): array
    {
        $response = $this->http->get("/api/passports/{$agentId}");
        return json_decode($response->getBody()->getContents(), true);
    }
}
