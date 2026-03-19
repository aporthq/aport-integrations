# APort Policy VS Code Extension

VS Code extension for APort policy development with IntelliSense, validation, and snippets.

## Features

- **Syntax Highlighting** for `.apolicy` and `.aport` files
- **Schema Validation** with autocomplete
- **Snippets** for quick policy creation
- **IntelliSense** for policy structure

## Installation

1. Open VS Code
2. Search "APort Policy Support" in Extensions
3. Install

## Usage

### Create New Policy

1. Create file `policy.apolicy`
2. Start typing or use snippets
3. Press `Ctrl+Space` for autocomplete

### Snippets

| Trigger | Description |
|---------|-------------|
| `aport-policy` | Basic policy template |
| `aport-allow` | Allow rule |
| `aport-deny` | Deny rule |

### Validation

The extension automatically validates your policy against the schema.

## Example Policy

```json
{
  "name": "my-policy",
  "version": "1.0.0",
  "description": "Example policy",
  "rules": [
    {
      "id": "allow-known-users",
      "action": "allow",
      "condition": {
        "field": "actor.id",
        "operator": "exists"
      },
      "message": "Known user"
    }
  ]
}
```

## Commands

- `APort: Validate Policy` - Manually validate current file
- `APort: Create Policy` - Create new policy file

## Development

```bash
npm install
npm run compile
```

## License

MIT
