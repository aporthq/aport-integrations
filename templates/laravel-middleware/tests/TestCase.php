<?php

namespace Aport\Laravel\Tests;

use Aport\Laravel\AportServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [
            AportServiceProvider::class,
        ];
    }
}
