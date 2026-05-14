const assert = require("node:assert/strict");
const test = require("node:test");

const {
  formatReasons,
  normalizeDecision,
  verifyPolicy,
} = require("../src/aport");

test("formats APort decision reasons", () => {
  assert.equal(
    formatReasons([{ message: "Missing assurance" }, { code: "limit_exceeded" }]),
    "Missing assurance, limit_exceeded"
  );
});

test("normalizes allow and deny responses", () => {
  assert.equal(normalizeDecision({ verified: true }).allowed, true);

  const denied = normalizeDecision({
    data: {
      decision: {
        allow: false,
        reasons: [{ message: "Policy denied" }],
      },
    },
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, "Policy denied");
});

test("verifyPolicy rejects missing agent ids before calling APort", async () => {
  const result = await verifyPolicy({
    agentId: "",
    policy: "code.repository.merge.v1",
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "Agent ID is required.");
});

test("verifyPolicy posts the expected APort request", async () => {
  const calls = [];
  const result = await verifyPolicy({
    agentId: "ap_agent",
    policy: "code.repository.merge.v1",
    context: { action: "merge_pr" },
    apiKey: "test-key",
    baseUrl: "https://aport.example",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });

      return {
        ok: true,
        async text() {
          return JSON.stringify({ decision: { allow: true } });
        },
      };
    },
  });

  assert.equal(result.allowed, true);
  assert.equal(calls[0].url, "https://aport.example/api/verify/policy/code.repository.merge.v1");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    context: {
      agent_id: "ap_agent",
      policy_id: "code.repository.merge.v1",
      context: { action: "merge_pr" },
    },
  });
});
