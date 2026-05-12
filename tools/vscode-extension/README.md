# APort Policy Tools for VS Code

VS Code extension for authoring APort policy packs.

## Features

- Syntax highlighting for `.aport-policy`, `.aport-policy.json`, `.aport-policy.yaml`, and `.aport-policy.yml`.
- JSON schema validation for `*.aport-policy.json` and `.github/aport-policy.json`.
- Completion suggestions for common policy fields.
- Snippets for policy packs and individual rules.
- Validation command for JSON and simple YAML policy files.
- Sample policy generation command.

## Commands

| Command | Description |
| --- | --- |
| `APort: Validate Policy Pack` | Validates the active APort policy file and reports diagnostics. |
| `APort: Insert Sample Policy Pack` | Inserts a starter policy pack using the configured default policy id. |

## Configuration

```json
{
  "aportPolicy.defaultPolicyId": "code.repository.merge.v1",
  "aportPolicy.validateOnSave": true
}
```

## Example Policy

```json
{
  "policy": {
    "id": "code.repository.merge.v1",
    "version": "1.0.0",
    "description": "Require APort verification before repository changes"
  },
  "rules": [
    {
      "id": "require-repository-capability",
      "effect": "allow",
      "condition": "agent.capabilities.includes('repo.merge')",
      "reason": "Agent must have repository merge capability"
    }
  ],
  "limits": {
    "max_files_changed": 25
  }
}
```

## Development

```bash
npm install
npm test
npm run check
```

## Package Layout

```text
src/extension.ts         VS Code activation, commands, completions, diagnostics
src/policyValidator.ts   Policy parser and validator
schemas/                 JSON schema for APort policy packs
snippets/                VS Code snippets
syntaxes/                TextMate grammar
```
