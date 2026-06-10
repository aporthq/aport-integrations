const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildVerificationPayload,
  formatDecision,
  parseDecision,
} = require("../src/aport");

test("builds an APort verification payload from Discord context", () => {
  const payload = buildVerificationPayload({
    userId: "123",
    action: "merge_pr",
    resource: "aporthq/aport-integrations#116",
    reason: "approved review",
    policyPack: "code.repository.merge.v1",
  });

  assert.equal(payload.policy_pack, "code.repository.merge.v1");
  assert.equal(payload.context.actor.type, "discord_user");
  assert.equal(payload.context.actor.id, "123");
  assert.equal(payload.context.action, "merge_pr");
  assert.equal(payload.context.resource, "aporthq/aport-integrations#116");
});

test("validates required payload fields", () => {
  assert.throws(
    () =>
      buildVerificationPayload({
        action: "merge_pr",
        policyPack: "code.repository.merge.v1",
      }),
    /Discord user id/
  );

  assert.throws(
    () =>
      buildVerificationPayload({
        userId: "123",
        policyPack: "code.repository.merge.v1",
      }),
    /Action is required/
  );
});

test("parses nested and direct APort decisions", () => {
  const nested = { data: { decision: { allow: true, decision_id: "dec_1" } } };
  const direct = { allow: false, decision_id: "dec_2" };

  assert.equal(parseDecision(nested).decision_id, "dec_1");
  assert.equal(parseDecision(direct).decision_id, "dec_2");
});

test("formats decision output for Discord replies", () => {
  const formatted = formatDecision({
    allow: false,
    decision_id: "dec_123",
    reasons: [{ message: "limit exceeded" }],
  });

  assert.equal(formatted.allow, false);
  assert.match(formatted.text, /Allow: no/);
  assert.match(formatted.text, /limit exceeded/);
  assert.match(formatted.text, /dec_123/);
});
