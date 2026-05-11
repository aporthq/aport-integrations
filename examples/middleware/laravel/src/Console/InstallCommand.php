<?php

namespace Aport\Laravel\Console;

use Illuminate\Console\Command;

class InstallCommand extends Command
{
    protected $signature = 'aport:install {--force : Overwrite existing config file}';

    protected $description = 'Publish APort Laravel configuration.';

    public function handle(): int
    {
        $this->call('vendor:publish', [
            '--tag' => 'aport-config',
            '--force' => (bool) $this->option('force'),
        ]);

        $this->line('');
        $this->info('APort Laravel middleware installed.');
        $this->line('Add these environment variables when you are ready to call the live API:');
        $this->line('APORT_API_KEY=your_api_key');
        $this->line('APORT_BASE_URL=https://aport.io');

        return self::SUCCESS;
    }
}
