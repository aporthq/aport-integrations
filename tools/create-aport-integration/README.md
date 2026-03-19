# create-aport-integration

CLI tool to scaffold APort integration projects from templates.

## Usage

```bash
npx create-aport-integration my-integration --template express
```

### Available Templates

| Template | Description |
|----------|-------------|
| `express` | Express.js middleware (default) |
| `nextjs` | Next.js middleware (App + Pages Router) |
| `fastapi` | FastAPI (Python) middleware |

### Examples

```bash
# Express.js
npx create-aport-integration my-express-app --template express

# Next.js
npx create-aport-integration my-nextjs-app --template nextjs

# FastAPI
npx create-aport-integration my-fastapi-app --template fastapi
```

## Development

```bash
npm install
node src/index.js test-project --template nextjs
```

## Testing

```bash
npm test
```

## License

MIT
