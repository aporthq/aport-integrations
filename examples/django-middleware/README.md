# APort Django Middleware

Django middleware package for APort verification.

## Installation

```bash
pip install aport-django
```

## Quick Start

### 1. Configure Settings

Add to your `settings.py`:

```python
APORT = {
    'API_KEY': 'your-aport-api-key',
    'PROJECT_ID': 'your-project-id',  # optional
    'ENABLED': True,  # set to False to disable
    'EXEMPT_URLS': [
        '/health/',
        '/admin/login/',
        '/api/public/',
    ],
}

MIDDLEWARE = [
    ...
    'aport.middleware.APortMiddleware',  # Add this at the end
]
```

### 2. Environment Variables

Or use environment variables:

```bash
export APORT_API_KEY=your-api-key
export APORT_PROJECT_ID=your-project-id
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `API_KEY` | str | None | Your APort API key |
| `PROJECT_ID` | str | 'default' | Your APort project ID |
| `ENABLED` | bool | True | Enable/disable verification |
| `EXEMPT_URLS` | list | [] | URLs to skip verification |

## Usage

### Using Middleware

Once configured, all requests will be verified automatically:

```python
# Settings
APORT = {
    'API_KEY': 'your-key',
}

MIDDLEWARE = [
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'aport.middleware.APortMiddleware',
]
```

### Standalone Function

You can also use the verification function directly:

```python
from aport import aport_verify

def my_view(request):
    result = aport_verify(
        action='custom_action',
        actor_id=request.user.id,
        actor_name=request.user.username,
        context={'data': 'value'}
    )
    
    if not result['allow']:
        return JsonResponse({'error': 'Denied'}, status=403)
    
    return JsonResponse({'success': True})
```

## Example Django App

See the `example/` directory for a complete Django project.

```bash
cd example
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Logging

The middleware logs important events:

```python
LOGGING = {
    'loggers': {
        'aport': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

## Error Handling

- If APort API is unreachable, requests are allowed by default
- Invalid API key will log an error
- Timeouts are handled gracefully (5 second timeout)

## Development

```bash
# Install for development
pip install -e .

# Run tests
pytest

# Build package
python setup.py sdist bdist_wheel
```

## License

MIT
