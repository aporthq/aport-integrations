# APort Hono Framework Example

Runnable APort policy verification for [Hono](https://hono.dev/) applications. The example protects refund and admin routes while keeping the public route open.

## What This Shows

- Hono middleware that verifies an agent before a route handler runs
- Agent ID extraction from headers, query parameters, or JSON body
- Request context passed into the policy verification call
- Fail-closed strict mode with an optional non-strict mode for demos
- Unit tests that run without real APort credentials by injecting a mock client

## Quick Start

```bash
cd examples/frameworks/hono
npm install
npm test
npm start
```

The server starts on `http://localhost:3000`.

## Try It

Public route:

```bash
curl http://localhost:3000/
```

Protected refund route:

```bash
curl -X POST http://localhost:3000/refund \
  -H "content-type: application/json" \
  -H "x-agent-id: agt_demo_refund_bot" \
  -d '{"amount":100}'
```

Protected admin route:

```bash
curl http://localhost:3000/admin \
  -H "x-agent-id: agt_demo_admin_bot"
```

## Integration Highlight

Add APort verification to Hono routes by creating a middleware factory and applying a policy pack before the route handler:

```javascript
import { Hono } from "hono";
import { createAPortHonoMiddleware } from "./src/index.js";

const app = new Hono();
const aport = createAPortHonoMiddleware({
  apiKey: process.env.APORT_API_KEY,
});

app.post("/refund", aport("finance.payment.refund.v1"), c => {
  const aportResult = c.get("aport");
  return c.json({ success: true, agentId: aportResult.agentId });
});
```

## Using The Real SDK

This example ships with a mock client so tests and demos work out of the box. In production, inject a client backed by `@aporthq/sdk-node`:

```javascript
import { APortClient } from "@aporthq/sdk-node";
import { createAPortHonoMiddleware } from "./src/index.js";

const aportClient = new APortClient({
  apiKey: process.env.APORT_API_KEY,
  baseUrl: process.env.APORT_BASE_URL,
});

const aport = createAPortHonoMiddleware({ client: aportClient });
```

Your injected client only needs a compatible `verify(policy, agentId, context)` method.

## Agent ID Sources

The middleware checks these sources in order:

1. `X-Agent-ID` header
2. `X-APort-Agent-ID` header
3. `agent_id` query parameter
4. `agent_id` JSON body field
5. `agentId` JSON body field
6. Static `agentId` middleware option

## Configuration

```bash
cp .env.example .env
```

Environment variables:

- `APORT_API_KEY`: APort API key for a real client
- `APORT_BASE_URL`: Optional APort API base URL
- `PORT`: Local server port

## Tests

```bash
npm test
```

The test suite covers successful verification, missing agent IDs, denied agents, strict fail-closed behavior, non-strict fallback behavior, and agent ID extraction.
