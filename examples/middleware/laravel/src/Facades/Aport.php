<?php

namespace Aport\Laravel\Facades;

use Aport\Laravel\Contracts\AportClient as AportClientContract;
use Illuminate\Support\Facades\Facade;

class Aport extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return AportClientContract::class;
    }
}
