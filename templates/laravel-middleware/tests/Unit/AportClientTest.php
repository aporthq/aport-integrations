<?php

namespace Aport\Laravel\Tests\Unit;

use Aport\Laravel\AportClient;
use Aport\Laravel\Exceptions\AportVerificationException;
use Aport\Laravel\Tests\TestCase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

class AportClientTest extends TestCase
{
    public function test_it_normalizes_successful_verification_responses(): void
    {
        Http::fake([
            'api.aport.io/*' => Http::response([
                'allow' => true,
                'passport' => ['agent_id' => 'agt_123'],
                'reasons' => ['within refund limit'],
            ]),
        ]);

        $client = new AportClient('test-key', 'https://api.aport.io', app(HttpFactory::class));
        $result = $client->verify('finance.payment.refund.v1', 'agt_123', ['amount' => 25]);

        $this->assertTrue($result['verified']);
        $this->assertSame('agt_123', $result['agent_id']);
        $this->assertSame(['within refund limit'], $result['reasons']);

        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'https://api.aport.io/api/verify/policy/finance.payment.refund.v1'
                && $request['agent_id'] === 'agt_123'
                && $request['context']['amount'] === 25;
        });
    }

    public function test_it_normalizes_string_reasons(): void
    {
        Http::fake([
            'api.aport.io/*' => Http::response([
                'verified' => false,
                'reasons' => 'refund limit exceeded',
            ]),
        ]);

        $client = new AportClient('test-key', 'https://api.aport.io', app(HttpFactory::class));
        $result = $client->verify('finance.payment.refund.v1', 'agt_123');

        $this->assertFalse($result['verified']);
        $this->assertSame(['refund limit exceeded'], $result['reasons']);
    }

    public function test_it_throws_when_api_key_is_missing(): void
    {
        $this->expectException(AportVerificationException::class);

        $client = new AportClient(null, 'https://api.aport.io', app(HttpFactory::class));
        $client->verify('finance.payment.refund.v1', 'agt_123');
    }

    public function test_it_throws_for_failed_api_responses(): void
    {
        Http::fake([
            'api.aport.io/*' => Http::response(['message' => 'Policy not found'], 404),
        ]);

        $this->expectException(AportVerificationException::class);
        $this->expectExceptionMessage('Policy not found');

        $client = new AportClient('test-key', 'https://api.aport.io', app(HttpFactory::class));
        $client->verify('missing.policy', 'agt_123');
    }
}
