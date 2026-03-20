<?php

namespace Aport\Laravel;

use Illuminate\Support\ServiceProvider;
use Aport\Laravel\Services\AportClient;
use Aport\Laravel\Facades\Aport;

class AportLaravelServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AportClient::class, function ($app) {
            return new AportClient([
                'base_url' => config('aport.base_url', 'https://api.aport.io'),
                'api_key' => config('aport.api_key'),
                'timeout' => config('aport.timeout', 5000),
            ]);
        });

        $this->app->alias(AportClient::class, 'aport');
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/Config/aport.php' => config_path('aport.php'),
        ], 'aport-config');

        $this->mergeConfigFrom(
            __DIR__ . '/Config/aport.php', 'aport'
        );
    }
}
