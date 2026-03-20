<?php

namespace Aport\Laravel;

use Illuminate\Support\ServiceProvider;

class AportLaravelServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton('aport', function ($app) {
            return new Services\AportClient();
        });

        $this->mergeConfigFrom(
            __DIR__ . '/Config/aport.php', 'aport'
        );
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/Config/aport.php' => config_path('aport.php'),
        ], 'aport-config');

        $router = $this->app['router'];

        $router->aliasMiddleware('aport.agent', Http\Middleware\VerifyAgent::class);
        $router->aliasMiddleware('aport.policy', Http\Middleware\EnforcePolicy::class);
        $router->aliasMiddleware('aport.optional', Http\Middleware\VerifyAgentOrGuest::class);
    }
}
