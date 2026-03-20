<?php

namespace Aport\Laravel\Traits;

trait HasAgent
{
    public function aportAgent(): ?array
    {
        return request()->attributes->get('aport_agent');
    }

    public function aportPolicy(): ?array
    {
        return request()->attributes->get('aport_policy');
    }

    public function agentId(): ?string
    {
        $agent = $this->aportAgent();
        return $agent['id'] ?? $agent['agent_id'] ?? null;
    }
}
