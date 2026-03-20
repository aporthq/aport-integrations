<?php

namespace Aport\Laravel;

use Illuminate\Support\Facades\Facade;

class Aport extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'aport';
    }
}
