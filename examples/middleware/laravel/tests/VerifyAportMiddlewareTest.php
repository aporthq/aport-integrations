<?php

namespace Aport\Laravel\Tests;

use Aport\Laravel\Contracts\AportClient;
use Aport\Laravel\DTO\VerificationResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class VerifyAportMiddlewareTest extends TestCase
{
    protected function defineRoutes($router): void
    {
        Route::post('/refunds', function (Request $request) {
            return response()->json($request->attributes->get('aport'));
        })->middleware('aport.verify:finance.payment.refund.v1');
    }

    public function test_it_allows_verified_agents(): void
    {
        $this->app->instance(AportClient::class, new FakeAportClient(
            new VerificationResult(true, 'finance.payment.refund.v1', 'agt_test', [
                'limits' => ['refund_amount_max_per_tx' => 1000],
            ]),
        ));

        $this->postJson('/refunds', ['amount' => 100], [
            'X-APort-Agent-ID' => 'agt_test',
        ])->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('agent_id', 'agt_test');
    }

    public function test_it_blocks_missing_agent_ids(): void
    {
        $this->postJson('/refunds', ['amount' => 100])
            ->assertStatus(400)
            ->assertJsonPath('error', 'aport_verification_failed');
    }

    public function test_it_blocks_unverified_agents(): void
    {
        $this->app->instance(AportClient::class, new FakeAportClient(
            new VerificationResult(false, 'finance.payment.refund.v1', 'agt_denied', null, 'Agent suspended'),
        ));

        $this->postJson('/refunds', [], [
            'X-Agent-ID' => 'agt_denied',
        ])->assertStatus(403)
            ->assertJsonPath('message', 'Agent suspended');
    }

    public function test_fail_open_allows_requests_when_configured(): void
    {
        config()->set('aport.fail_open', true);

        $this->app->instance(AportClient::class, new ThrowingAportClient());

        $this->postJson('/refunds', [], [
            'X-Agent-ID' => 'agt_soft_fail',
        ])->assertOk()
            ->assertJsonPath('verified', false)
            ->assertJsonPath('agent_id', 'agt_soft_fail');
    }
}

class FakeAportClient implements AportClient
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

class ThrowingAportClient implements AportClient
{
    public function verify(string $policy, string $agentId, array $context = []): VerificationResult
    {
        throw new \RuntimeException('network down');
    }
}
