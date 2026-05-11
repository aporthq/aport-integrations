<?php

namespace Aport\Laravel\Tests;

use Aport\Laravel\AportLaravelServiceProvider;
use Orchestra\Testbench\TestCase as OrchestraTestCase;

abstract class TestCase extends OrchestraTestCase
{
    /**
     * @param mixed $app
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            AportLaravelServiceProvider::class,
        ];
    }
}
