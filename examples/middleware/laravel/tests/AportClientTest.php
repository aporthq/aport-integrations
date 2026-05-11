<?php

namespace Aport\Laravel\Tests;

use Aport\Laravel\Exceptions\VerificationRequestException;
use Aport\Laravel\Support\AportClient;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;

class AportClientTest extends TestCase
{
    public function test_it_posts_policy_verification_requests(): void
    {
        $mock = new MockHandler([
            new Response(200, ['Content-Type' => 'application/json'], json_encode([
                'verified' => true,
                'passport' => [
                    'agentId' => 'agt_test',
                    'limits' => ['refund_amount_max_per_tx' => 5000],
                ],
                'message' => 'ok',
            ])),
        ]);

        $client = new AportClient([
            'base_url' => 'https://aport.test',
            'api_key' => 'secret',
        ], new Client([
            'base_uri' => 'https://aport.test',
            'handler' => HandlerStack::create($mock),
        ]));

        $result = $client->verify('finance.payment.refund.v1', 'agt_test', ['amount' => 50]);

        $this->assertTrue($result->verified());
        $this->assertSame('agt_test', $result->agentId());
        $this->assertSame(5000, $result->passport()['limits']['refund_amount_max_per_tx']);
    }

    public function test_it_rejects_invalid_json_responses(): void
    {
        $mock = new MockHandler([
            new Response(200, ['Content-Type' => 'application/json'], 'not-json'),
        ]);

        $client = new AportClient([], new Client([
            'base_uri' => 'https://aport.test',
            'handler' => HandlerStack::create($mock),
        ]));

        $this->expectException(VerificationRequestException::class);

        $client->verify('finance.payment.refund.v1', 'agt_test');
    }
}
