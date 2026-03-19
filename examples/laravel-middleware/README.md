# APort Laravel Middleware

Laravel middleware package for APort verification.

## Installation

```bash
composer require aport/laravel
```

## Configuration

### Publish Config

```bash
php artisan vendor:publish --provider="APort\Laravel\APortServiceProvider" --tag="aport-config"
```

### Configure .env

```env
APORT_API_KEY=your-api-key
APORT_PROJECT_ID=your-project-id
APORT_ENABLED=true
```

Or edit `config/aport.php`:

```php
return [
    'api_key' => 'your-api-key',
    'project_id' => 'default',
    'enabled' => true,
    'exempt_routes' => [
        'health',
        'api/public',
    ],
];
```

## Usage

### Register Middleware

Add to `app/Http/Kernel.php`:

```php
protected $middlewareAliases = [
    ...
    'aport' => \App\Http\Middleware\APortVerification::class,
];
```

Or use in routes:

```php
Route::middleware(['aport'])->group(function () {
    Route::get('/protected', [Controller::class, 'protected']);
});
```

## Standalone Function

You can also use verification directly:

```php
use APort\Laravel\Facades\APort;

function myController(Request $request) {
    $result = APort::verify(
        action: 'custom_action',
        actor_id: $request->user()->id,
        actor_name: $request->user()->name,
        context: ['key' => 'value']
    );
    
    if (!($result['allow'] ?? true)) {
        return response()->json(['error' => 'Denied'], 403);
    }
    
    return response()->json(['success' => true]);
}
```

## Exempt Routes

Configure routes to skip verification:

```php
// config/aport.php
'exempt_routes' => [
    'health',
    'api/public',
    'webhook/*',
],
```

## Error Handling

- If APort API is unreachable, requests are allowed by default
- Invalid API key will log an error
- 5 second timeout

## License

MIT
