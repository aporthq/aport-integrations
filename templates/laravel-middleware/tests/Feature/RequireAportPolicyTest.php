<?php

namespace Aport\Laravel\Tests\Feature;

use Aport\Laravel\Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

class RequireAportPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('aport.api_key', 'test-key');

        Route::post('/refunds', function (Request $request) {
            return response()->json([
                'agent_id' => $request->attributes->get('aport.agent_id'),
                'policy' => $request->attributes->get('aport.policy'),
                'verified' => $request->attributes->get('aport')['verified'] ?? null,
            ]);
        })->middleware('aport.policy:finance.payment.refund.v1');
    }

    public function test_it_allows_verified_agents(): void
    {
        Http::fake([
            'api.aport.io/*' => Http::response([
                'verified' => true,
                'passport' => ['agent_id' => 'agt_123'],
            ]),
        ]);

        $response = $this
            ->withHeader('X-Agent-ID', 'agt_123')
            ->postJson('/refunds', ['amount' => 10]);

        $response
            ->assertOk()
            ->assertJson([
                'agent_id' => 'agt_123',
                'policy' => 'finance.payment.refund.v1',
            ]);
    }

    public function test_it_rejects_missing_agent_ids(): void
    {
        $response = $this->postJson('/refunds', ['amount' => 10]);

        $response
            ->assertStatus(400)
            ->assertJson([
                'message' => 'APort agent id is required.',
            ]);
    }

    public function test_it_rejects_denied_policy_results(): void
    {
        Http::fake([
            'api.aport.io/*' => Http::response([
                'verified' => false,
                'reasons' => ['refund limit exceeded'],
            ]),
        ]);

        $response = $this
            ->withHeader('X-Agent-ID', 'agt_123')
            ->postJson('/refunds', ['amount' => 1000]);

        $response
            ->assertStatus(403)
            ->assertJson([
                'message' => 'APort policy denied this request.',
                'reasons' => ['refund limit exceeded'],
            ]);
    }

    public function test_it_fails_closed_when_aport_returns_an_error(): void
    {
        Http::fake([
            'api.aport.io/*' => Http::response(['message' => 'APort unavailable'], 503),
        ]);

        $response = $this
            ->withHeader('X-Agent-ID', 'agt_123')
            ->postJson('/refunds', ['amount' => 10]);

        $response
            ->assertStatus(502)
            ->assertJson([
                'message' => 'APort verification failed.',
                'detail' => 'APort unavailable',
            ]);
    }

    public function test_it_can_fail_open_with_agent_and_policy_attributes(): void
    {
        config()->set('aport.fail_open', true);

        Http::fake([
            'api.aport.io/*' => Http::response(['message' => 'APort unavailable'], 503),
        ]);

        $response = $this
            ->withHeader('X-Agent-ID', 'agt_123')
            ->postJson('/refunds', ['amount' => 10]);

        $response
            ->assertOk()
            ->assertJson([
                'agent_id' => 'agt_123',
                'policy' => 'finance.payment.refund.v1',
                'verified' => false,
            ]);
    }
}
