# APort CLI — Quick Integration Setup

Scaffold a new project with APort authentication in seconds.

## Usage

```bash
# Interactive mode
npx aport-init

# Skip prompts with --template
npx aport-init --template fastapi ./my-api
npx aport-init --template flask ./my-flask-app
npx aport-init --template django ./my-django-app
npx aport-init --template express ./my-express-app
npx aport-init --template nextjs ./my-next-app
```

## Supported Templates

| Template   | Stack                          |
|------------|--------------------------------|
| `fastapi`  | Python — FastAPI + uvicorn     |
| `flask`    | Python — Flask                 |
| `django`   | Python — Django                |
| `express`  | Node.js — Express              |
| `nextjs`   | Node.js — Next.js (Pages)      |

## What's Generated

- Framework boilerplate with a working server
- APort auth middleware / decorator
- `.env.example` with `APORT_API_KEY` placeholder
- `README.md` with setup instructions

## After Scaffolding

1. `cp .env.example .env` and set your APort API key
2. Install dependencies (`pip install -r requirements.txt` or `npm install`)
3. Start the server
4. Hit `/protected` with a valid APort token to test

## License

MIT
