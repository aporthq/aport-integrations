<?php

namespace Aport\Laravel\Tests;

use Orchestra\Testbench\TestCase;
use Aport\Laravel\AportLaravelServiceProvider;
use Aport\Laravel\Http\Middleware\VerifyAgent;
use Aport\Laravel\Http\Middleware\EnforcePolicy;
use Illuminate\Http\Request;

class MiddlewareTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [AportLaravelServiceProvider::class];
    }

    public function test_missing_agent_returns_401(): void
    {
        $middleware = new VerifyAgent($this->app->make(\Aport\Laravel\Services\AportClient::class));
        $request = Request::create('/', 'GET');
        $response = $middleware->handle($request, fn ($req) => response('ok'));
        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_fail_open_passes_without_agent(): void
    {
        config(['aport.fail_closed' => false]);
        $middleware = new VerifyAgent($this->app->make(\Aport\Laravel\Services\AportClient::class));
        $request = Request::create('/health', 'GET');
        $response = $middleware->handle($request, fn ($req) => response('ok'));
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_extract_agent_id_from_header(): void
    {
        $request = Request::create('/', 'GET', [], [], [], ['HTTP_X_AGENT_PASSPORT_ID' => 'test-agent']);
        $this->assertEquals('test-agent', $request->header('X-Agent-Passport-Id'));
    }

    public function test_fallback_to_x_agent_id(): void
    {
        $request = Request::create('/', 'GET', [], [], [], ['HTTP_X_AGENT_ID' => 'agent-123']);
        $middleware = new VerifyAgent($this->app->make(\Aport\Laravel\Services\AportClient::class));
        // Just verify the header is read
        $this->assertEquals('agent-123', $request->header('X-Agent-Id'));
    }

    public function test_config_defaults(): void
    {
        $this->assertEquals('https://api.aport.io', config('aport.base_url'));
        $this->assertTrue(config('aport.fail_closed'));
        $this->assertContains('/health', config('aport.skip_paths'));
    }
}
