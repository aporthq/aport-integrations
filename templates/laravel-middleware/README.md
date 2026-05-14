# APort Laravel Middleware Package

Composer package template for protecting Laravel routes with APort policy verification.
It includes route middleware, a small APort HTTP client, configuration publishing,
an Artisan policy-stub command, tests, and a runnable example layout.

## Features

- `aport.policy` route middleware for Laravel 10, 11, and 12.
- Agent id extraction from `X-Agent-ID`, `X-APort-Agent-ID`, query strings, or JSON bodies.
- APort verification requests with Laravel's HTTP client.
- Fail-closed behavior by default, with an optional `APORT_FAIL_OPEN=true` mode.
- `php artisan aport:policy` command to create local policy context stubs.
- PHPUnit/Testbench coverage for allow, deny, and missing-agent paths.

## Installation

```bash
composer require aporthq/laravel-middleware
php artisan vendor:publish --tag=aport-config
```

Set the required environment variables:

```env
APORT_API_KEY=aport_test_key
APORT_BASE_URL=https://api.aport.io
APORT_DEFAULT_POLICY=finance.payment.refund.v1
APORT_TIMEOUT=5
APORT_FAIL_OPEN=false
```

Laravel package auto-discovery registers `AportServiceProvider` and aliases the
middleware as `aport.policy`.

## Route Usage

```php
use App\Http\Controllers\RefundController;
use Illuminate\Support\Facades\Route;

Route::post('/refunds', [RefundController::class, 'store'])
    ->middleware('aport.policy:finance.payment.refund.v1');
```

Requests must include an agent id:

```bash
curl -X POST http://localhost/api/refunds \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: agt_refund_bot_123" \
  -d '{"amount": 49.99, "order_id": "ord_123"}'
```

After a successful check, the middleware adds attributes to the request:

```php
$request->attributes->get('aport');
$request->attributes->get('aport.agent_id');
$request->attributes->get('aport.passport');
$request->attributes->get('aport.policy');
```

## Artisan Command

Create a local policy context stub:

```bash
php artisan aport:policy refund-approval --policy=finance.payment.refund.v1
```

This writes `config/aport-policies/refund-approval.json` with a starter context
document that teams can review next to their Laravel configuration.

## Example App

See `examples/laravel-app` for a minimal route/controller layout that protects a
refund endpoint. Copy those files into a Laravel application, configure
`APORT_API_KEY`, and run the route through Laravel's normal HTTP kernel.

## Testing

```bash
composer install
composer test
```

The tests use Orchestra Testbench and Laravel HTTP fakes. No live APort API call
or real API key is required.

## Notes

The package uses Laravel's HTTP client as a lightweight transport wrapper. If an
official `aporthq/sdk-php` package is installed later, `AportClient` can be
adapted behind the same middleware contract without changing application routes.
