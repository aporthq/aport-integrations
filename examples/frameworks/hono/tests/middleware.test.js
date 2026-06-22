import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Hono } from "hono";

import { createAPortHonoMiddleware } from "../src/index.js";

function makeApp(client, middlewareOptions = {}) {
  const app = new Hono();
  const aport = createAPortHonoMiddleware({ client });

  app.get("/public", c => c.json({ message: "public" }));
  app.post("/refund", aport("finance.payment.refund.v1", middlewareOptions), c => {
    const aportResult = c.get("aport");
    const body = c.get("aportBody");

    return c.json({
      success: true,
      agentId: aportResult.agentId,
      amount: body.amount,
    });
  });

  return app;
}

async function json(response) {
  return response.json();
}

describe("APort Hono middleware", () => {
  it("allows public routes without verification", async () => {
    const app = makeApp({ verify: async () => ({ verified: true }) });

    const response = await app.request("/public");
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { message: "public" });
  });

  it("verifies an agent from the X-Agent-ID header", async () => {
    const calls = [];
    const app = makeApp({
      verify: async (policy, agentId, context) => {
        calls.push({ policy, agentId, context });
        return {
          verified: true,
          passport: { limits: { refund_amount_max_per_tx: 1000 } },
        };
      },
    });

    const response = await app.request("/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-id": "agt_header_123",
      },
      body: JSON.stringify({ amount: 100 }),
    });

    assert.equal(response.status, 200);
    assert.equal((await json(response)).agentId, "agt_header_123");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].policy, "finance.payment.refund.v1");
    assert.equal(calls[0].agentId, "agt_header_123");
    assert.equal(calls[0].context.path, "/refund");
  });

  it("extracts an agent ID from query parameters", async () => {
    const calls = [];
    const app = makeApp({
      verify: async (_policy, agentId) => {
        calls.push(agentId);
        return { verified: true, passport: {} };
      },
    });

    const response = await app.request("/refund?agent_id=agt_query_123", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 100 }),
    });

    assert.equal(response.status, 200);
    assert.equal(calls[0], "agt_query_123");
  });

  it("extracts an agent ID from the JSON request body", async () => {
    const calls = [];
    const app = makeApp({
      verify: async (_policy, agentId) => {
        calls.push(agentId);
        return { verified: true, passport: {} };
      },
    });

    const response = await app.request("/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 100, agent_id: "agt_body_123" }),
    });

    assert.equal(response.status, 200);
    assert.equal(calls[0], "agt_body_123");
  });

  it("rejects requests without an agent ID", async () => {
    const app = makeApp({
      verify: async () => {
        throw new Error("should not verify without agent id");
      },
    });

    const response = await app.request("/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 100 }),
    });

    assert.equal(response.status, 400);
    assert.equal((await json(response)).error, "Agent ID required");
  });

  it("rejects unverified agents", async () => {
    const app = makeApp({
      verify: async () => ({ verified: false, message: "Denied by policy" }),
    });

    const response = await app.request("/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-id": "agt_denied",
      },
      body: JSON.stringify({ amount: 100 }),
    });

    assert.equal(response.status, 403);
    assert.equal((await json(response)).message, "Denied by policy");
  });

  it("fails closed when verification errors in strict mode", async () => {
    const app = makeApp({
      verify: async () => {
        throw new Error("APort API unavailable");
      },
    });

    const response = await app.request("/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-id": "agt_error",
      },
      body: JSON.stringify({ amount: 100 }),
    });

    assert.equal(response.status, 500);
    assert.equal((await json(response)).error, "Verification error");
  });

  it("can continue in non-strict mode after verification errors", async () => {
    const app = makeApp(
      {
        verify: async () => {
          throw new Error("APort API unavailable");
        },
      },
      { strict: false },
    );

    const response = await app.request("/refund", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-id": "agt_error",
      },
      body: JSON.stringify({ amount: 100 }),
    });

    assert.equal(response.status, 200);
    assert.equal((await json(response)).agentId, "agt_error");
  });
});
