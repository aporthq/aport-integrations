# APort Policy Tools for VS Code

VS Code language support for APort policy pack development.

## Features

- JSON schema validation and IntelliSense for `*.aport-policy.json` and `*.aport.json` files
- APort-aware validation command for JSON and YAML policy packs
- Syntax highlighting for common policy identifiers, effects, and policy keys
- Snippets for full policy packs and individual rules
- Example JSON and YAML policy packs

## Quick Start

```bash
cd tools/vscode-extension
npm install
npm run compile
```

Launch the extension from VS Code with the extension host, or package it locally:

```bash
npm run package
code --install-extension aport-policy-tools-0.1.0.vsix
```

Open one of the examples in `examples/` and run `APort: Validate Current Policy Pack`.

## Supported Files

- `*.aport-policy.json`
- `*.aport.json`
- `*.aport-policy.yaml`
- `*.aport-policy.yml`

## Policy Shape

Policy packs are expected to include:

- `id`: versioned dotted identifier, such as `finance.payment.refund.v1`
- `name`: display name
- `version`: semantic version
- `description`: short policy summary
- `rules`: one or more rules with `id`, `effect`, and `action`

Supported rule effects are `allow`, `deny`, and `review`.

## Development

```bash
npm install
npm run compile
npm test
```

The validation logic lives in `src/policyValidation.ts` so it can be tested without starting a VS Code extension host.

## Example

```json
{
  "id": "finance.payment.refund.v1",
  "name": "Refund Approval Policy",
  "version": "1.0.0",
  "description": "Controls agent-initiated refunds.",
  "defaults": {
    "effect": "deny",
    "reason": "No matching APort policy rule."
  },
  "rules": [
    {
      "id": "small-refund",
      "effect": "allow",
      "action": "refund.create",
      "conditions": {
        "amount": { "lte": 50 },
        "currency": "USD"
      }
    }
  ]
}
```
