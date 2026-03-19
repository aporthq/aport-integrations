# APort CLI - Quick Integration Setup

Interactive CLI tool for quickly setting up APort integrations with popular frameworks.

## Supported Frameworks

- **Express.js** (Node.js)
- **Next.js** (React)
- **Django** (Python)
- **Flask** (Python)

## Installation

### Global Installation
```bash
npm install -g aport-cli
aport
```

### Using npx (Recommended)
```bash
npx aport-cli
```

### Local Installation
```bash
git clone https://github.com/aporthq/aport-integrations.git
cd aport-integrations/examples/aport-cli
npm install
npm start
```

## Usage

Run the CLI:
```bash
npx aport-cli
```

The CLI will prompt you to:
1. Select a framework
2. Enter a project name
3. Automatically generate all necessary files

## Features

### Interactive Prompts
- Framework selection
- Project name validation
- Overwrite protection

### Generated Files
For each framework, the CLI generates:
- Main application file
- Package/requirements file
- `.env.example` with APort configuration
- Basic README

### Framework Templates

#### Express.js
- Basic Express server with APort middleware
- Protected API route example

#### Next.js
- Next.js middleware for APort verification
- API route protection

#### Django
- Django views with APort verification
- Requirements file

#### Flask
- Flask app with APort verification decorator
- Requirements file

## Configuration

After generation, configure your `.env` file:

```env
APORT_API_KEY=your-api-key-here
APORT_PROJECT_ID=your-project-id
```

## Example

```bash
$ npx aport-cli

╔═══════════════════════════════════════════╗
║     APort Integration CLI v1.0.0         ║
║     Quick integration setup tool         ║
╚═══════════════════════════════════════════╝

? Select a framework: Express.js (Node.js)
? Enter project name: my-api

✓ Created index.js
✓ Created package.json
✓ Created .env.example
✓ Created README.md

✅ Setup complete!
```

## Development

To run from source:
```bash
npm install
npm start
```

## License

MIT
