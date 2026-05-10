# APort Next.js Middleware Example

This example demonstrates one Next.js app using APort verification in both routing systems:

- Root `middleware.ts` protects `/protected/*`
- App Router route handler: `app/api/refund/route.ts`
- Pages Router API route: `pages/api/admin.ts`

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The example resolves `@aporthq/middleware-nextjs` to the local template source, so it can run from a fresh checkout before the package is published.

In development, `APORT_STRICT=false` lets you exercise the protected routes without a live APort account. Set `APORT_STRICT=true` and provide a real `APORT_API_KEY` to fail closed on verification errors.

## Try It

```bash
curl -H "x-agent-id: agt_demo" http://localhost:3000/protected

curl -X POST \
  -H "content-type: application/json" \
  -H "x-agent-id: agt_demo" \
  -d '{"amount": 500, "currency": "USD"}' \
  http://localhost:3000/api/refund

curl -H "x-agent-id: agt_demo" http://localhost:3000/api/admin
```
