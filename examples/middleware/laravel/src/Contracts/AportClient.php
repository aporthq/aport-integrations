<?php

namespace Aport\Laravel\Contracts;

use Aport\Laravel\DTO\VerificationResult;

interface AportClient
{
    /**
     * Verify an agent against an APort policy pack.
     *
     * @param array<string, mixed> $context
     */
    public function verify(string $policy, string $agentId, array $context = []): VerificationResult;
}
