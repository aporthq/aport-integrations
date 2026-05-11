<?php

namespace Aport\Laravel;

use Aport\Laravel\Console\InstallCommand;
use Aport\Laravel\Console\VerifyCommand;
use Aport\Laravel\Contracts\AportClient as AportClientContract;
use Aport\Laravel\Http\Middleware\VerifyAport;
use Aport\Laravel\Support\AportClient;
use Illuminate\Routing\Router;
use Illuminate\Support\ServiceProvider;

class AportLaravelServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/aport.php', 'aport');

        $this->app->singleton(AportClientContract::class, function ($app) {
            return new AportClient($app['config']->get('aport', []));
        });

        $this->app->alias(AportClientContract::class, 'aport');
    }

    public function boot(Router $router): void
    {
        $this->publishes([
            __DIR__ . '/../config/aport.php' => config_path('aport.php'),
        ], 'aport-config');

        $router->aliasMiddleware('aport.verify', VerifyAport::class);
        $router->aliasMiddleware('aport.policy', VerifyAport::class);

        if ($this->app->runningInConsole()) {
            $this->commands([
                InstallCommand::class,
                VerifyCommand::class,
            ]);
        }
    }
}
