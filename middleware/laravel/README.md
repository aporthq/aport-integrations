# APort Laravel Middleware

Agent identity verification and policy enforcement for Laravel applications.

## Installation

```bash
composer require aport/aport-laravel
php artisan vendor:publish --tag=aport-config
```

## Configuration

Add to your `.env`:
```
APORT_API_KEY=your_api_key
APORT_BASE_URL=https://api.aport.io
APORT_FAIL_CLOSED=true
APORT_SKIP_PATHS=/health,/metrics
```

## Usage

### Route Middleware
```php
Route::middleware('aport.agent')->get('/protected', fn () => 'Hello Agent');
Route::middleware('aport.policy:finance.payment.refund.v1')->post('/refund', [RefundController::class, 'store']);
```

### Available Middleware
- `aport.agent` — Verify agent identity (401 if missing)
- `aport.policy:{policy_id}` — Enforce specific policy (403 on violation)
- `aport.guest` — Verify agent if present, allow guests (fail-open)

### Access Agent Data
```php
$agent = $request->agent;        // Agent passport info
$policy = $request->policy_result; // Policy decision
```

## License
MIT
