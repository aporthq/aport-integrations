<?php

namespace Aport\Laravel\Console;

use Aport\Laravel\Contracts\AportClient;
use Illuminate\Console\Command;
use JsonException;
use Throwable;

class VerifyCommand extends Command
{
    protected $signature = 'aport:verify
        {agentId : APort agent ID}
        {policy? : Policy pack identifier}
        {--context= : JSON context passed to APort}';

    protected $description = 'Verify an APort agent against a policy pack.';

    public function handle(AportClient $client): int
    {
        $policy = (string) ($this->argument('policy') ?: config('aport.default_policy'));
        $context = [];

        if ($this->option('context')) {
            try {
                $context = json_decode((string) $this->option('context'), true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException $exception) {
                $this->error('The --context option must be valid JSON.');

                return self::INVALID;
            }

            if (! is_array($context)) {
                $this->error('The --context option must decode to a JSON object.');

                return self::INVALID;
            }
        }

        try {
            $result = $client->verify($policy, (string) $this->argument('agentId'), $context);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Field', 'Value'], [
            ['verified', $result->verified() ? 'yes' : 'no'],
            ['agent_id', $result->agentId()],
            ['policy', $result->policy()],
            ['message', $result->message() ?: '-'],
        ]);

        return $result->verified() ? self::SUCCESS : self::FAILURE;
    }
}
