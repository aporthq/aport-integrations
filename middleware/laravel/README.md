# APort Laravel Middleware

Laravel middleware package for [APort](https://aport.io) agent verification and policy enforcement.

## Installation

```bash
composer require aport/aport-laravel
```

Publish the config:

```bash
php artisan vendor:publish --tag=aport-config
```

## Configuration

Add to your `.env`:

```env
APORT_API_KEY=your-api-key
APORT_BASE_URL=https://api.aport.io
APORT_TIMEOUT=10
APORT_FAIL_CLOSED=true
```

## Middleware

### `aport.agent` — Verify Agent

Requires a valid agent ID. Returns 401 if missing, 403 if invalid.

```php
Route::middleware('aport.agent')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
});
```

Agent ID can be passed via:
- Header: `X-APort-Agent-Id`
- Query parameter: `agent_id`

### `aport.policy` — Enforce Policy

Verifies agent against a specific policy. Returns 403 if policy check fails.

```php
Route::middleware('aport.policy:premium-plan')->group(function () {
    Route::get('/premium', [PremiumController::class, 'index']);
});
```

### `aport.optional` — Verify Agent (Fail-Open)

Attaches agent info if present, but doesn't block unauthenticated requests.

```php
Route::middleware('aport.optional')->group(function () {
    Route::get('/content', [ContentController::class, 'index']);
});
```

## Accessing Agent Info

```php
// In a controller
$agent = $request->attributes->get('aport_agent');
$policy = $request->attributes->get('aport_policy');
```

Or use the `HasAgent` trait on any class:

```php
use Aport\Laravel\Traits\HasAgent;

class MyService
{
    use HasAgent;

    public function doSomething()
    {
        $agent = $this->aportAgent();
        $id = $this->agentId();
    }
}
```

## Facade

```php
use Aport\Facades\Aport;

$response = Aport::verifyAgent('agent-123');
$response = Aport::verifyPolicy('policy-id', 'agent-123');
$response = Aport::getPassportView('agent-123');
```

## Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `api_key` | `''` | APort API key |
| `base_url` | `https://api.aport.io` | API base URL |
| `timeout` | `10` | Request timeout (seconds) |
| `skip_paths` | `[]` | Paths to skip middleware |
| `fail_closed` | `true` | Block on API errors |

## License

MIT
