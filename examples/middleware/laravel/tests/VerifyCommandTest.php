<?php

namespace Aport\Laravel\Tests;

use Aport\Laravel\Contracts\AportClient;
use Aport\Laravel\DTO\VerificationResult;

class VerifyCommandTest extends TestCase
{
    public function test_verify_command_returns_success_for_verified_agents(): void
    {
        $this->app->instance(AportClient::class, new CommandFakeAportClient(
            new VerificationResult(true, 'finance.payment.refund.v1', 'agt_cli', null, 'ok'),
        ));

        $this->artisan('aport:verify', [
            'agentId' => 'agt_cli',
            'policy' => 'finance.payment.refund.v1',
            '--context' => '{"amount":50}',
        ])->assertExitCode(0);
    }

    public function test_verify_command_rejects_invalid_context_json(): void
    {
        $this->artisan('aport:verify', [
            'agentId' => 'agt_cli',
            'policy' => 'finance.payment.refund.v1',
            '--context' => 'not-json',
        ])->assertExitCode(2);
    }
}

class CommandFakeAportClient implements AportClient
{
    public function __construct(private readonly VerificationResult $result)
    {
    }

    public function verify(string $policy, string $agentId, array $context = []): VerificationResult
    {
        return VerificationResult::fromArray(array_merge($this->result->toArray(), [
            'policy' => $policy,
            'agent_id' => $agentId,
        ]), $policy, $agentId);
    }
}
