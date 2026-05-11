# create-aport-integration

Scaffold APort-ready starter projects for common frameworks.

This package provides the `npx create-aport-integration` workflow requested for fast integration setup. It generates runnable examples with APort policy verification, `.env.example` files, and framework-specific documentation.

## Quick Start

From this repository:

```bash
cd tools/create-aport-integration
npm install
npm link
create-aport-integration my-refund-app --template express
```

When published to npm:

```bash
npx create-aport-integration my-refund-app --template express
```

## Commands

```bash
# Create an Express project
create-aport-integration my-api --template express

# Create a Next.js App Router project
create-aport-integration my-web-app --template nextjs

# Create a FastAPI project
create-aport-integration my-service --template fastapi

# Use a different default policy pack
create-aport-integration refund-guard --template express --policy finance.payment.refund.v1

# Prompt for project name, template, policy, and output directory
create-aport-integration --interactive

# List templates
create-aport-integration list

# Validate a generated project
create-aport-integration validate ./my-api
```

## Templates

| Template | Output |
| --- | --- |
| `express` | Express API with protected `/api/refunds` route |
| `nextjs` | Next.js App Router API route and starter page |
| `fastapi` | FastAPI service with protected `/api/refunds` route |

Each template includes:

- APort policy verification helper.
- Example protected endpoint.
- Environment variable sample.
- Project README with setup, run, and test curl commands.

## Interactive Mode

Interactive mode uses Node.js built-in prompts, so no extra prompt dependency is required:

```bash
create-aport-integration --interactive
```

The CLI asks for the project name, framework template, policy pack, output directory, and whether existing generated files may be overwritten.

## Development

```bash
npm install
npm test
npm run check
```

## Notes

Generated projects default to `finance.payment.refund.v1`, matching APort's refund guardrail examples. Override it with `--policy`.
