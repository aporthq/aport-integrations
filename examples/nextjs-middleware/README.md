# APort Next.js Middleware Example

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aporthq/aport-integrations&project-name=aport-nextjs-middleware-example&repository-name=aport-nextjs-middleware-example&root-directory=examples/nextjs-middleware&env=APORT_API_KEY,APORT_POLICY_ID,APORT_API_BASE_URL&envDescription=APort%20credentials%20used%20by%20the%20Next.js%20middleware%20example&envLink=https://aport.io/dashboard)

This example shows how to protect a Next.js App Router route with APort policy verification from the Next.js middleware/proxy layer.

## Quick Start

Requires Node.js 20.9 or newer.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and add your APort credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Run the example:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000/protected` with an `x-agent-id` header to exercise the middleware guard.

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `APORT_API_KEY` | Yes | API key used to call APort from middleware. |
| `APORT_POLICY_ID` | Yes | Policy checked before allowing access to `/protected`. |
| `APORT_API_BASE_URL` | No | APort API origin. Defaults to `https://api.aport.io`. |

## How It Works

- `proxy.ts` only runs for `/protected/:path*`.
- The proxy extracts an agent id from `x-agent-id` or `authorization`.
- It calls `POST /verify` with the configured policy and request context.
- Allowed responses continue to the protected page.
- Denied, missing, or failed verification returns a friendly JSON error instead of exposing the route.

## Vercel Deployment

The Deploy button points Vercel at this example directory with `root-directory=examples/nextjs-middleware`.
During deployment, set `APORT_API_KEY`, `APORT_POLICY_ID`, and optionally `APORT_API_BASE_URL`.
