<?php

namespace Aport\Laravel\Console;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Str;

class MakeAportPolicyCommand extends Command
{
    protected $signature = 'aport:policy {name : Local policy stub name} {--policy= : APort policy pack id}';

    protected $description = 'Create a local APort policy context stub.';

    public function handle(Filesystem $files): int
    {
        $name = Str::of($this->argument('name'))->kebab()->toString();
        $policy = $this->option('policy') ?: config('aport.default_policy');
        $directory = config_path('aport-policies');
        $path = $directory . DIRECTORY_SEPARATOR . $name . '.json';

        if ($files->exists($path) && ! $this->confirm("{$path} already exists. Overwrite it?")) {
            $this->warn('Policy stub was not changed.');

            return self::FAILURE;
        }

        $files->ensureDirectoryExists($directory);
        $files->put($path, json_encode([
            'policy' => $policy,
            'description' => 'Describe the protected action here.',
            'context' => [
                'source' => 'laravel',
                'action' => $name,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);

        $this->info("Created APort policy stub: {$path}");

        return self::SUCCESS;
    }
}
