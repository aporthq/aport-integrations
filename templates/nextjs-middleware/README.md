# APort Next.js Middleware

Next.js middleware and route helpers for enforcing APort policy verification in App Router and Pages Router applications.

## Quick Start

```bash
npm install @aporthq/middleware-nextjs @aporthq/sdk-node
```

Create `middleware.ts` at the root of your Next.js app:

```typescript
import { createAPortMiddleware } from "@aporthq/middleware-nextjs";

export default createAPortMiddleware("finance.payment.refund.v1");

export const config = {
  matcher: ["/refund/:path*", "/admin/:path*"],
};
```

Requests are allowed only when APort returns an allowed policy decision. The middleware forwards verification state to downstream routes using:

- `x-aport-verified`
- `x-aport-agent-id`
- `x-aport-decision-id`

## Configuration

```bash
APORT_API_KEY=your_api_key_here
APORT_BASE_URL=https://api.aport.io
```

```typescript
import { createAPortMiddleware } from "@aporthq/middleware-nextjs";

export default createAPortMiddleware("admin.access", {
  apiKey: process.env.APORT_API_KEY,
  baseUrl: process.env.APORT_BASE_URL,
  timeoutMs: 800,
  strict: true,
});
```

## Agent ID Sources

By default, the middleware checks for an agent ID in this order:

1. `x-agent-id` header
2. `x-aport-agent-id` header
3. `agent_id` or `agentId` query parameter
4. `aport_agent_id` or `agent_id` cookie

You can override the extraction logic:

```typescript
export default createAPortMiddleware("admin.access", {
  agentId: (request) => request.headers.get("x-my-agent-id"),
});
```

## App Router Route Handlers

Use `withAPortRouteHandler` when you want policy verification inside an App Router route handler:

```typescript
import { withAPortRouteHandler } from "@aporthq/middleware-nextjs";

export const POST = withAPortRouteHandler(
  "finance.payment.refund.v1",
  async (request, _context, aport) => {
    const body = await request.json();

    return Response.json({
      success: true,
      agentId: aport.agentId,
      decisionId: aport.decision?.decision_id,
      amount: body.amount,
    });
  },
);
```

## Pages Router API Routes

Use `withAPortApiRoute` for `pages/api` handlers:

```typescript
import type { NextApiResponse } from "next";
import {
  type APortNextApiRequest,
  withAPortApiRoute,
} from "@aporthq/middleware-nextjs";

export default withAPortApiRoute(
  "admin.access",
  async (req: APortNextApiRequest, res: NextApiResponse) => {
    res.status(200).json({
      success: true,
      agentId: req.aport?.agentId,
      verified: req.aport?.verified,
    });
  },
);
```

## Pages Router Server-Side Props

Use `withAPortGetServerSideProps` to protect server-rendered Pages Router pages:

```typescript
import { withAPortGetServerSideProps } from "@aporthq/middleware-nextjs";

export const getServerSideProps = withAPortGetServerSideProps(
  "admin.access",
  async (_context, aport) => ({
    props: {
      agentId: aport.agentId,
    },
  }),
  {
    redirectTo: "/login",
  },
);
```

## Error Handling

Strict mode is enabled by default. If APort cannot be reached, requests fail closed with a `500` response.

```typescript
export default createAPortMiddleware("admin.access", {
  strict: false,
});
```

In non-strict mode, verification API errors allow the request to continue while marking `x-aport-verified` as `false`. Missing agent IDs and denied policy decisions still fail the request.

You can customize middleware responses:

```typescript
export default createAPortMiddleware("admin.access", {
  onDenied: (result) =>
    Response.json(
      {
        error: "Not allowed",
        reasons: result.reasons,
      },
      { status: 403 },
    ),
});
```

## Example App

The `examples/next-app` folder includes:

- Root `middleware.ts` protecting `/protected/*`
- App Router route handler at `app/api/refund/route.ts`
- Pages Router API route at `pages/api/admin.ts`

Run it locally:

```bash
cd examples/next-app
npm install
cp .env.example .env.local
npm run dev
```

## Testing

```bash
npm install
npm test
npm run build
```
