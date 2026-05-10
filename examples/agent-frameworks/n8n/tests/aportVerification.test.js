const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildOutputPayload,
  isAllowedDecision,
  parseContextJson,
  verifyPassport,
} = require("../src/aportVerification");

test("parseContextJson returns an empty object for empty input", () => {
  assert.deepEqual(parseContextJson(""), {});
  assert.deepEqual(parseContextJson(undefined), {});
});

test("parseContextJson parses valid JSON strings", () => {
  assert.deepEqual(parseContextJson('{"amount":500,"currency":"USD"}'), {
    amount: 500,
    currency: "USD",
  });
});

test("parseContextJson rejects invalid JSON strings", () => {
  assert.throws(() => parseContextJson("{bad json"), /Context must be valid JSON/);
});

test("isAllowedDecision understands common APort response shapes", () => {
  assert.equal(isAllowedDecision({ allow: true }), true);
  assert.equal(isAllowedDecision({ allowed: true }), true);
  assert.equal(isAllowedDecision({ verified: true }), true);
  assert.equal(isAllowedDecision({ decision: "approved" }), true);
  assert.equal(isAllowedDecision({ status: "denied" }), false);
});

test("buildOutputPayload appends normalized APort result to input JSON", () => {
  const payload = buildOutputPayload({
    inputJson: { orderId: "order_123" },
    includeInputData: true,
    passportId: "ap_123",
    policyId: "finance.payment.refund.v1",
    response: {
      allow: true,
      decision_id: "dec_123",
      assurance_level: "verified",
      reasons: [],
    },
  });

  assert.equal(payload.orderId, "order_123");
  assert.deepEqual(payload.aport, {
    passportId: "ap_123",
    policyId: "finance.payment.refund.v1",
    allowed: true,
    decisionId: "dec_123",
    assuranceLevel: "verified",
    reasons: [],
    rawResponse: {
      allow: true,
      decision_id: "dec_123",
      assurance_level: "verified",
      reasons: [],
    },
  });
});

test("verifyPassport calls the SDK client with passport ID, policy ID, context, and idempotency key", async () => {
  const calls = [];
  const client = {
    async verifyPolicy(...args) {
      calls.push(args);
      return { allow: true };
    },
  };

  const result = await verifyPassport({
    client,
    passportId: "ap_123",
    policyId: "code.repository.merge.v1",
    context: { repository: "aporthq/aport-integrations" },
    idempotencyKey: "idem_123",
  });

  assert.deepEqual(result, { allow: true });
  assert.deepEqual(calls, [
    [
      "ap_123",
      "code.repository.merge.v1",
      { repository: "aporthq/aport-integrations" },
      "idem_123",
    ],
  ]);
});

test("verifyPassport validates required inputs", async () => {
  await assert.rejects(
    () =>
      verifyPassport({
        client: { verifyPolicy: async () => ({ allow: true }) },
        passportId: "",
        policyId: "policy",
      }),
    /Passport ID is required/
  );

  await assert.rejects(
    () =>
      verifyPassport({
        client: {},
        passportId: "ap_123",
        policyId: "policy",
      }),
    /verifyPolicy/
  );
});
