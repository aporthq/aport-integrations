# create-aport-integration

Scaffold APort integration examples for common frameworks.

## Usage

```bash
npx create-aport-integration my-aport-app --framework express
```

Supported frameworks:

- `express`
- `nextjs`
- `django`

## Options

```text
-f, --framework <name>   Framework to scaffold
-d, --directory <path>   Target directory. Defaults to project name
-y, --yes                Use defaults for missing options
    --force              Allow writing into a non-empty directory
-h, --help               Show help
```

## Examples

```bash
npx create-aport-integration refund-guard --framework express
npx create-aport-integration merge-check --framework nextjs --directory apps/merge-check
npx create-aport-integration admin-approval --framework django
```

Each generated project includes:

- `.env.example` with APort settings.
- A minimal protected action endpoint.
- A README with run and curl instructions.
- Framework-specific files that can run after installing dependencies.

## Local development

```bash
cd tools/create-aport-integration
npm test
node src/index.js demo-app --framework express --directory /tmp/demo-app
```
