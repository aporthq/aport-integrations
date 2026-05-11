# APort Developer Tools for VS Code

VS Code extension template for APort policy and passport development. It adds snippets, syntax highlighting, and IntelliSense helpers for common APort integration files.

## Features

- APort policy language mode for `.aport-policy` files and `APortfile`
- APort-specific syntax highlighting injected into JSON policy and passport files
- Syntax highlighting for policy pack IDs, agent IDs, capabilities, and common APort keys
- JSON schema validation for policy and passport fixtures
- Completion items for APort policy keys, sample policy packs, and common capabilities
- JavaScript, TypeScript, JSON, JSONC, and YAML snippets for APort integrations
- `APort: Open Documentation` command from the command palette

## Local development

```bash
cd tools/vscode-extension
npm install
npm run compile
npm test
```

Launch the extension from VS Code with `Run Extension`, then open one of the files in `examples/` to verify completions and schema validation.

## Snippets

| Language | Prefix | Description |
| --- | --- | --- |
| JavaScript | `aport-verify` | Create an APort verification request |
| JavaScript | `aport-express` | Protect an Express route with APort middleware |
| TypeScript | `aport-next-middleware` | Add APort verification to Next.js middleware |
| JSON/JSONC/APort Policy | `aport-policy` | Create an APort policy fixture |
| JSON/JSONC/APort Policy | `aport-passport` | Create an APort passport fixture |
| YAML | `aport-action` | Add an APort verify step to GitHub Actions |

## File patterns

The extension contributes JSON schema validation for:

- `*.aport.json`
- `*.aport-policy.json`
- `aport.policy.json`
- `*.aport-passport.json`
- `aport-passport.json`
- `aport.passport.json`

## Example

```json
{
  "policy_pack": "finance.payment.refund.v1",
  "agent_id": "agt_inst_refund_bot_123",
  "verification_level": "github",
  "context": {
    "amount": 50,
    "currency": "USD"
  },
  "limits": {
    "refund_amount_max_per_tx": 100
  }
}
```
