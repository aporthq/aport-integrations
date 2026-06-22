class MockAPortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl = options.baseUrl || process.env.APORT_BASE_URL || "https://api.aport.io";
  }

  async verify(policy, agentId, context = {}) {
    return {
      verified: true,
      passport: {
        agentId,
        capabilities: ["finance.payment.refund.v1"],
        limits: { refund_amount_max_per_tx: 1000 },
      },
      policy,
      context,
      message: "Mock verification successful",
    };
  }
}

async function readJsonBody(c) {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function extractAgentId(c, options = {}) {
  const body = c.get("aportBody") || {};
  const candidates = [
    c.req.header("x-agent-id"),
    c.req.header("x-aport-agent-id"),
    c.req.query("agent_id"),
    body.agent_id,
    body.agentId,
    options.agentId,
  ];

  return candidates.find(value => typeof value === "string" && value.length > 0) || null;
}

function createAPortHonoMiddleware(options = {}) {
  const client =
    options.client ||
    new MockAPortClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
    });

  return function requirePolicy(policy, middlewareOptions = {}) {
    return async function aportPolicyMiddleware(c, next) {
      const body = await readJsonBody(c);
      c.set("aportBody", body);

      const agentId = extractAgentId(c, middlewareOptions);
      if (!agentId) {
        return c.json(
          {
            error: "Agent ID required",
            message: "Provide X-Agent-ID, X-APort-Agent-ID, agent_id, or agentId.",
          },
          400,
        );
      }

      try {
        const result = await client.verify(policy, agentId, {
          method: c.req.method,
          path: new URL(c.req.url).pathname,
          ...middlewareOptions.context,
        });

        if (!result.verified) {
          return c.json(
            {
              error: "Verification failed",
              message: result.message || "Agent verification failed",
              details: result.details,
            },
            403,
          );
        }

        c.set("aport", {
          verified: true,
          agentId,
          passport: result.passport,
          policy,
          result,
        });

        return next();
      } catch (error) {
        if (middlewareOptions.strict === false) {
          c.set("aport", {
            verified: false,
            agentId,
            policy,
            error: error.message,
          });
          return next();
        }

        return c.json(
          {
            error: "Verification error",
            message: "Internal verification error",
          },
          500,
        );
      }
    };
  };
}

export { MockAPortClient, createAPortHonoMiddleware, extractAgentId };
