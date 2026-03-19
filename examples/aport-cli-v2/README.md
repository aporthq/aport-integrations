# Create APort Integration CLI

Interactive CLI to scaffold APort integrations for popular frameworks.

## Installation

```bash
npm install -g create-aport-integration
```

## Usage

```bash
npx create-aport-integration
# or
create-aport-integration
```

## Supported Frameworks

- Express.js (Node.js)
- FastAPI (Python)
- Next.js

## Features

- Interactive prompts
- Multiple framework templates
- Automatic file generation
- Environment config

## Example

```bash
$ npx create-aport-integration
? Select framework: Express.js (Node.js)
? Project name: my-api

✓ Created index.js
✓ Created package.json
✓ Created .env.example

Done! cd my-api && npm install
```

## License

MIT
