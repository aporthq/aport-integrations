<?php

namespace Aport\Laravel\DTO;

class VerificationResult
{
    /**
     * @param array<string, mixed>|null $passport
     * @param array<string, mixed> $details
     * @param array<string, mixed> $raw
     */
    public function __construct(
        private readonly bool $verified,
        private readonly string $policy,
        private readonly string $agentId,
        private readonly ?array $passport = null,
        private readonly ?string $message = null,
        private readonly array $details = [],
        private readonly array $raw = [],
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function fromArray(array $payload, string $policy, string $agentId): self
    {
        return new self(
            (bool) ($payload['verified'] ?? $payload['success'] ?? false),
            (string) ($payload['policy'] ?? $payload['policy_id'] ?? $policy),
            (string) ($payload['agent_id'] ?? $payload['agentId'] ?? $agentId),
            isset($payload['passport']) && is_array($payload['passport']) ? $payload['passport'] : null,
            isset($payload['message']) ? (string) $payload['message'] : null,
            isset($payload['details']) && is_array($payload['details']) ? $payload['details'] : [],
            $payload,
        );
    }

    public function verified(): bool
    {
        return $this->verified;
    }

    public function policy(): string
    {
        return $this->policy;
    }

    public function agentId(): string
    {
        return $this->agentId;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function passport(): ?array
    {
        return $this->passport;
    }

    public function message(): ?string
    {
        return $this->message;
    }

    /**
     * @return array<string, mixed>
     */
    public function details(): array
    {
        return $this->details;
    }

    /**
     * @return array<string, mixed>
     */
    public function raw(): array
    {
        return $this->raw;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'verified' => $this->verified,
            'policy' => $this->policy,
            'agent_id' => $this->agentId,
            'passport' => $this->passport,
            'message' => $this->message,
            'details' => $this->details,
            'raw' => $this->raw,
        ];
    }
}
