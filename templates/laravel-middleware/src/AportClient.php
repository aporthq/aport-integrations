<?php

namespace Aport\Laravel;

use Aport\Laravel\Exceptions\AportVerificationException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\PendingRequest;

class AportClient
{
    public function __construct(
        private readonly ?string $apiKey,
        private readonly string $baseUrl = 'https://api.aport.io',
        private readonly ?HttpFactory $http = null,
        private readonly int $timeout = 5,
    ) {
    }

    /**
     * Verify an APort agent against a policy pack.
     *
     * @return array{
     *     verified: bool,
     *     policy: string,
     *     agent_id: string,
     *     passport: mixed,
     *     reasons: array,
     *     raw: array
     * }
     */
    public function verify(string $policy, string $agentId, array $context = []): array
    {
        if ($this->apiKey === null || $this->apiKey === '') {
            throw new AportVerificationException('APort API key is not configured.');
        }

        $response = $this->request()->post(
            '/api/verify/policy/' . rawurlencode($policy),
            [
                'agent_id' => $agentId,
                'context' => $context === [] ? (object) [] : $context,
            ],
        );

        if (! $response->successful()) {
            throw AportVerificationException::fromResponse($response);
        }

        $data = $response->json() ?? [];
        $verified = (bool) ($data['verified'] ?? $data['allow'] ?? false);

        return [
            'verified' => $verified,
            'policy' => (string) ($data['policy'] ?? $policy),
            'agent_id' => (string) ($data['agent_id'] ?? $agentId),
            'passport' => $data['passport'] ?? null,
            'reasons' => $this->normalizeReasons($data['reasons'] ?? []),
            'raw' => $data,
        ];
    }

    private function normalizeReasons(mixed $reasons): array
    {
        if ($reasons === null || $reasons === '') {
            return [];
        }

        return is_array($reasons) ? $reasons : [$reasons];
    }

    private function request(): PendingRequest
    {
        $factory = $this->http ?? app(HttpFactory::class);

        return $factory
            ->baseUrl(rtrim($this->baseUrl, '/'))
            ->acceptJson()
            ->asJson()
            ->timeout($this->timeout)
            ->withToken($this->apiKey);
    }
}
