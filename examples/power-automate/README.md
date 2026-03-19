# Microsoft Power Automate Connector

APort integration for Microsoft Power Automate.

## What It Does

- Verify actions within Power Automate workflows
- Block suspicious flows
- Enterprise automation security

## Installation

1. Go to Power Automate
2. Search "APort" in connectors
3. Create connection with API key

## Usage

### Verify Action

```json
{
  "action": "send_email",
  "actorId": "user-123",
  "actorName": "John Doe",
  "context": {
    "to": "user@example.com"
  }
}
```

### Check Access

```json
{
  "actorId": "user-123",
  "resource": "/api/data"
}
```

## Actions

### Verify Action

Verify any action with APort.

### Check Access

Check if actor has access to resource.

## Example Flow

1. Trigger (Form submission)
2. APort Verify Action
3. If allowed → Continue flow
4. If denied → Send notification

## Documentation

For detailed setup, visit https://docs.aport.io

## License

MIT
