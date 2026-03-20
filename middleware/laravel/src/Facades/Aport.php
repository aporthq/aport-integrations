<?php

namespace Aport\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

class Aport extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Aport\Laravel\Services\AportClient::class;
    }
}
