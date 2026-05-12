"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  Aport,
  buildVerifyPayload,
  coerceValue,
  isVerified,
  normalizeBaseUrl,
  parseJsonObject,
  toOutputItem,
} = require("../nodes/Aport/Aport.node");

function createRuntime({
  params,
  items = [{ json: { order_id: "ord_123", amount: 42 } }],
  credentials = { baseUrl: "https://aport.test/", apiKey: "test-key", timeout: 2500 },
  response = { verified: true, passport: { agent_id: "agt_123" }, message: "ok" },
  continueOnFail = false,
}) {
  const requests = [];

  return {
    runtime: {
      getInputData() {
        return items;
      },
      getNodeParameter(name) {
        if (Object.prototype.hasOwnProperty.call(params, name)) {
          return params[name];
        }
        throw new Error(`Missing node parameter: ${name}`);
      },
      async getCredentials(name) {
        assert.equal(name, "aportApi");
        return credentials;
      },
      continueOnFail() {
        return continueOnFail;
      },
      helpers: {
        async httpRequest(options) {
          requests.push(options);
          return response;
        },
      },
    },
    requests,
  };
}

test("normalizes APort base URLs", () => {
  assert.equal(normalizeBaseUrl("https://aport.io/"), "https://aport.io");
  assert.equal(normalizeBaseUrl("https://aport.io///"), "https://aport.io");
  assert.equal(normalizeBaseUrl(undefined), "https://aport.io");
});

test("parses JSON context objects and rejects invalid shapes", () => {
  assert.deepEqual(parseJsonObject('{"amount":100}', "Context JSON"), { amount: 100 });
  assert.deepEqual(parseJsonObject("", "Context JSON"), {});
  assert.throws(() => parseJsonObject("[1,2]", "Context JSON"), /must be a JSON object/);
  assert.throws(() => parseJsonObject("{bad", "Context JSON"), /Invalid Context JSON/);
});

test("coerces key/value context field strings", () => {
  assert.equal(coerceValue("true"), true);
  assert.equal(coerceValue("false"), false);
  assert.equal(coerceValue("null"), null);
  assert.equal(coerceValue("12.5"), 12.5);
  assert.equal(coerceValue("agt_123"), "agt_123");
});

test("builds the policy verification payload expected by APort", () => {
  assert.deepEqual(
    buildVerifyPayload("agt_123", "finance.payment.refund.v1", { amount: 42 }),
    {
      context: {
        agent_id: "agt_123",
        policy_id: "finance.payment.refund.v1",
        context: { amount: 42 },
      },
    }
  );
});

test("detects allowed APort responses across compatible response names", () => {
  assert.equal(isVerified({ verified: true }), true);
  assert.equal(isVerified({ allowed: true }), true);
  assert.equal(isVerified({ authorized: true }), true);
  assert.equal(isVerified({ decision: "allow" }), true);
  assert.equal(isVerified({ verified: false }), false);
});

test("formats verification output with route fields", () => {
  const output = toOutputItem(
    { json: { order_id: "ord_123" } },
    { verified: false, message: "policy denied" },
    { itemIndex: 0 }
  );

  assert.equal(output.json.order_id, "ord_123");
  assert.equal(output.json.aport_verified, false);
  assert.equal(output.json.aport_route, "denied");
  assert.equal(output.json.aport.message, "policy denied");
  assert.deepEqual(output.pairedItem, { item: 0 });
});

test("executes policy verification through n8n httpRequest helper", async () => {
  const node = new Aport();
  const { runtime, requests } = createRuntime({
    params: {
      operation: "verifyPolicy",
      agentId: "agt_123",
      policyId: "finance.payment.refund.v1",
      includeInputJson: true,
      contextMode: "json",
      contextJson: '{"currency":"USD"}',
      throwOnDeny: false,
      includeRawResponse: false,
    },
  });

  const [result] = await node.execute.call(runtime);

  assert.equal(result[0].json.aport_verified, true);
  assert.equal(result[0].json.aport_route, "verified");
  assert.equal(requests[0].method, "POST");
  assert.equal(
    requests[0].url,
    "https://aport.test/api/verify/policy/finance.payment.refund.v1"
  );
  assert.equal(requests[0].headers.Authorization, "Bearer test-key");
  assert.equal(requests[0].timeout, 2500);
  assert.deepEqual(requests[0].body.context.context, {
    order_id: "ord_123",
    amount: 42,
    currency: "USD",
  });
});

test("uses key/value context fields when selected", async () => {
  const node = new Aport();
  const { runtime, requests } = createRuntime({
    params: {
      operation: "verifyPolicy",
      agentId: "agt_123",
      policyId: "finance.payment.refund.v1",
      includeInputJson: false,
      contextMode: "keyValue",
      contextPairs: {
        values: [
          { key: "amount", value: "100" },
          { key: "requires_review", value: "true" },
        ],
      },
      throwOnDeny: false,
      includeRawResponse: true,
    },
  });

  const [result] = await node.execute.call(runtime);

  assert.equal(result[0].json.aport_verified, true);
  assert.deepEqual(requests[0].body.context.context, {
    amount: 100,
    requires_review: true,
  });
});

test("throws on denied verification when configured", async () => {
  const node = new Aport();
  const { runtime } = createRuntime({
    params: {
      operation: "verifyPolicy",
      agentId: "agt_123",
      policyId: "finance.payment.refund.v1",
      includeInputJson: true,
      contextMode: "json",
      contextJson: "{}",
      throwOnDeny: true,
      includeRawResponse: false,
    },
    response: { verified: false, message: "denied by policy" },
  });

  await assert.rejects(() => node.execute.call(runtime), /denied by policy/);
});

test("gets passport details for an agent", async () => {
  const node = new Aport();
  const { runtime, requests } = createRuntime({
    params: {
      operation: "getPassport",
      agentId: "agt_123",
      includeRawResponse: false,
    },
    response: { agent_id: "agt_123", capabilities: ["refund"] },
  });

  const [result] = await node.execute.call(runtime);

  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].url, "https://aport.test/api/verify/agt_123");
  assert.equal(result[0].json.aport_passport.agent_id, "agt_123");
});
