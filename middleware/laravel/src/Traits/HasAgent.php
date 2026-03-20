<?php

namespace Aport\Laravel\Traits;

trait HasAgent
{
    public function getAgentAttribute(): ?array
    {
        return request()->attributes->get('agent');
    }

    public function getPolicyResultAttribute(): ?array
    {
        return request()->attributes->get('policy_result');
    }
}
