# APort Laravel Middleware

Laravel middleware, configuration, and Artisan commands for verifying APort agent passports before protected routes run.

## Features

- Route middleware alias: `aport.verify`
- Config publishing with `php artisan aport:install`
- `aport:verify` Artisan smoke-test command
- `Aport` facade and injectable `Aport\Laravel\Contracts\AportClient`
- Mock-friendly client and tests that do not require live APort credentials
- Example refund route and controller

## Install

```bash
composer require aporthq/laravel-aport
php artisan aport:install
```

Set credentials when you are ready to call the live API:

```bash
APORT_API_KEY=your_api_key
APORT_BASE_URL=https://aport.io
APORT_DEFAULT_POLICY=finance.payment.refund.v1
```

## Protect a Route

```php
use Illuminate\Support\Facades\Route;

Route::post('/refunds', [RefundController::class, 'store'])
    ->middleware('aport.verify:finance.payment.refund.v1');
```

Send the agent ID in either `X-APort-Agent-ID`, `X-Agent-ID`, `agent_id`, or `agentId`.

```bash
curl -X POST http://localhost/refunds \
  -H 'X-APort-Agent-ID: agt_inst_refund_bot_123' \
  -H 'Content-Type: application/json' \
  -d '{"amount": 50}'
```

When verification succeeds, the middleware attaches the result to the request:

```php
$aport = $request->attributes->get('aport');
$passport = $request->attributes->get('aport.passport');
```

## Artisan Verification

```bash
php artisan aport:verify agt_inst_refund_bot_123 finance.payment.refund.v1 \
  --context='{"amount":50,"currency":"USD"}'
```

## Error Handling

By default, failed verification blocks the request:

- `400` when no agent ID is present
- `403` when APort denies the policy
- `502` when the APort service cannot be reached

Set `APORT_FAIL_OPEN=true` only for non-production demos where requests should continue if APort is temporarily unavailable. In fail-open mode, `$request->attributes->get('aport')` contains `verified: false` and an `error` message.

## Development

```bash
cd examples/middleware/laravel
composer install
composer test
```

The tests use mocked HTTP responses and a fake client binding, so they do not need a real API key.
