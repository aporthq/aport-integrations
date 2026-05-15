<?php

namespace Aport\Laravel;

use Aport\Laravel\Console\MakeAportPolicyCommand;
use Aport\Laravel\Http\Middleware\RequireAportPolicy;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\ServiceProvider;

class AportServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/aport.php', 'aport');

        $this->app->singleton(AportClient::class, function ($app): AportClient {
            return new AportClient(
                config('aport.api_key'),
                config('aport.base_url', 'https://api.aport.io'),
                $app->make(HttpFactory::class),
                (int) config('aport.timeout', 5),
            );
        });
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../config/aport.php' => config_path('aport.php'),
        ], 'aport-config');

        $this->app['router']->aliasMiddleware('aport.policy', RequireAportPolicy::class);

        if ($this->app->runningInConsole()) {
            $this->commands([
                MakeAportPolicyCommand::class,
            ]);
        }
    }
}
