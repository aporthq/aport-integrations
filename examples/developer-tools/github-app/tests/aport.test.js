const assert = require("node:assert/strict");
const test = require("node:test");

const {
  formatReasons,
  normalizeDecision,
  verifyAportPolicy,
} = require("../src/aport");

test("formats decision reasons", () => {
  assert.equal(
    formatReasons([{ message: "Missing assurance" }, { code: "limit_exceeded" }]),
    "Missing assurance, limit_exceeded"
  );
});

test("normalizes allow decisions", () => {
  assert.deepEqual(normalizeDecision({ decision: { allow: true } }).allowed, true);
  assert.deepEqual(normalizeDecision({ verified: true }).allowed, true);
});

test("normalizes deny decisions with reason text", () => {
  const result = normalizeDecision({
    data: {
      decision: {
        allow: false,
        reasons: [{ message: "Policy denied" }],
      },
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "Policy denied");
});

test("verifyAportPolicy fails when agent id is missing", async () => {
  const result = await verifyAportPolicy({
    agentId: "",
    policy: "code.repository.merge.v1",
    context: {},
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "Missing APort agent id");
});

test("verifyAportPolicy posts expected payload", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    return {
      ok: true,
      async text() {
        return JSON.stringify({ decision: { allow: true } });
      },
    };
  };

  const result = await verifyAportPolicy({
    agentId: "octocat",
    policy: "code.repository.merge.v1",
    context: { repository: "owner/repo" },
    apiKey: "test-key",
    baseUrl: "https://aport.example",
    fetchImpl,
  });

  assert.equal(result.allowed, true);
  assert.equal(calls[0].url, "https://aport.example/api/verify/policy/code.repository.merge.v1");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    context: {
      agent_id: "octocat",
      policy_id: "code.repository.merge.v1",
      context: { repository: "owner/repo" },
    },
  });
});
