<?php

namespace Aport\Laravel\Tests;

use Aport\Laravel\Services\AportClient;
use Aport\Laravel\Http\Middleware\VerifyAgent;
use Aport\Laravel\Http\Middleware\EnforcePolicy;
use Aport\Laravel\Http\Middleware\VerifyAgentOrGuest;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use ReflectionProperty;

class MiddlewareTest extends TestCase
{
    protected function makeClient(array $responses): AportClient
    {
        $mock = new MockHandler($responses);
        $stack = HandlerStack::create($mock);
        $client = new Client(['handler' => $stack]);

        $aport = new AportClient();
        $prop = new ReflectionProperty(AportClient::class, 'http');
        $prop->setAccessible(true);
        $prop->setValue($aport, $client);

        return $aport;
    }

    public function test_verify_agent_blocks_missing_id(): void
    {
        $middleware = new VerifyAgent($this->makeClient([]));
        $request = Request::create('/api/test', 'GET');
        $response = $middleware->handle($request, fn () => response('ok'));
        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_verify_agent_allows_valid_agent(): void
    {
        $client = $this->makeClient([
            new Response(200, [], json_encode(['id' => 'agent-1', 'name' => 'Test'])),
        ]);
        $middleware = new VerifyAgent($client);
        $request = Request::create('/api/test', 'GET');
        $request->headers->set('X-APort-Agent-Id', 'agent-1');

        $response = $middleware->handle($request, function ($req) {
            $this->assertEquals(['id' => 'agent-1', 'name' => 'Test'], $req->attributes->get('aport_agent'));
            return response('ok');
        });
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_verify_agent_blocks_invalid_agent(): void
    {
        $client = $this->makeClient([
            new Response(403, [], json_encode(['error' => 'invalid'])),
        ]);
        $middleware = new VerifyAgent($client);
        $request = Request::create('/api/test', 'GET');
        $request->headers->set('X-APort-Agent-Id', 'bad-agent');

        $response = $middleware->handle($request, fn () => response('ok'));
        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_enforce_policy_blocks_missing_agent(): void
    {
        $middleware = new EnforcePolicy($this->makeClient([]));
        $request = Request::create('/api/test', 'GET');
        $response = $middleware->handle($request, fn () => response('ok'), 'policy-1');
        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_enforce_policy_allows_valid_policy(): void
    {
        $client = $this->makeClient([
            new Response(200, [], json_encode(['policy_id' => 'policy-1', 'status' => 'allowed'])),
        ]);
        $middleware = new EnforcePolicy($client);
        $request = Request::create('/api/test', 'GET');
        $request->headers->set('X-APort-Agent-Id', 'agent-1');

        $response = $middleware->handle($request, function ($req) {
            $policy = $req->attributes->get('aport_policy');
            $this->assertEquals('allowed', $policy['status']);
            return response('ok');
        }, 'policy-1');
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_enforce_policy_blocks_failed_policy(): void
    {
        $client = $this->makeClient([
            new Response(403, [], json_encode(['error' => 'denied'])),
        ]);
        $middleware = new EnforcePolicy($client);
        $request = Request::create('/api/test', 'GET');
        $request->headers->set('X-APort-Agent-Id', 'agent-1');

        $response = $middleware->handle($request, fn () => response('ok'), 'policy-1');
        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_verify_agent_or_guest_passes_without_agent(): void
    {
        $middleware = new VerifyAgentOrGuest($this->makeClient([]));
        $request = Request::create('/api/test', 'GET');

        $response = $middleware->handle($request, function ($req) {
            $this->assertNull($req->attributes->get('aport_agent'));
            return response('ok');
        });
        $this->assertEquals(200, $response->getStatusCode());
    }
}
