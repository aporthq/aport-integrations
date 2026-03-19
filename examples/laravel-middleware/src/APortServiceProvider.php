<?php

namespace APort\Laravel;

use Illuminate\Support\ServiceProvider as BaseServiceProvider;

class APortServiceProvider extends BaseServiceProvider
{
    /**
     * Register services
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/config/aport.php',
            'aport'
        );
    }
    
    /**
     * Bootstrap services
     */
    public function boot(): void
    {
        // Publish config
        $this->publishes([
            __DIR__ . '/config/aport.php' => config_path('aport.php'),
        ], 'aport-config');
        
        // Publish middleware
        $this->publishes([
            __DIR__ . '/Http/Middleware/APortVerification.php' => 
                app_path('Http/Middleware/APortVerification.php'),
        ], 'aport-middleware');
    }
}
