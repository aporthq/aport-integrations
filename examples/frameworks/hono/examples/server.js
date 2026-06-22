import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { createAPortHonoMiddleware } from "../src/index.js";

const app = new Hono();
const aport = createAPortHonoMiddleware({
  apiKey: process.env.APORT_API_KEY,
  baseUrl: process.env.APORT_BASE_URL,
});

app.get("/", c =>
  c.json({
    message: "APort Hono example",
    routes: {
      refund: "POST /refund",
      admin: "GET /admin",
    },
  }),
);

app.post("/refund", aport("finance.payment.refund.v1"), c => {
  const body = c.get("aportBody") || {};
  const aportResult = c.get("aport");
  const maxRefund = aportResult.passport?.limits?.refund_amount_max_per_tx ?? 0;

  if (Number(body.amount || 0) > maxRefund) {
    return c.json(
      {
        error: "Refund exceeds policy limit",
        requested: body.amount,
        limit: maxRefund,
      },
      403,
    );
  }

  return c.json({
    success: true,
    agentId: aportResult.agentId,
    policy: aportResult.policy,
    amount: body.amount,
  });
});

app.get(
  "/admin",
  aport("admin.access", {
    context: { endpoint: "admin" },
  }),
  c => {
    const aportResult = c.get("aport");
    return c.json({
      success: true,
      agentId: aportResult.agentId,
      capabilities: aportResult.passport?.capabilities || [],
    });
  },
);

const port = Number(process.env.PORT || 3000);

serve({
  fetch: app.fetch,
  port,
});

console.log(`APort Hono example listening on http://localhost:${port}`);
