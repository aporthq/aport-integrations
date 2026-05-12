import * as assert from "node:assert/strict";
import test = require("node:test");

import {
  createSamplePolicy,
  parsePolicyDocument,
  policyKeyCompletions,
  validatePolicyDocument,
} from "../policyValidator";

test("validates a complete JSON policy", () => {
  const issues = validatePolicyDocument(
    JSON.stringify({
      policy: {
        id: "code.repository.merge.v1",
        version: "1.0.0",
      },
      rules: [
        {
          id: "require-capability",
          effect: "allow",
          condition: "agent.capabilities.includes('repo.merge')",
        },
      ],
    })
  );

  assert.deepEqual(issues, []);
});

test("reports missing required policy fields", () => {
  const issues = validatePolicyDocument(
    JSON.stringify({
      policy: {
        id: "bad",
      },
      rules: [],
    })
  );

  assert.equal(issues.some((issue) => issue.path === "$.policy.version"), true);
  assert.equal(issues.some((issue) => issue.path === "$.rules"), true);
  assert.equal(issues.some((issue) => issue.severity === "warning"), true);
});

test("reports invalid JSON", () => {
  const issues = validatePolicyDocument("{");

  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Invalid JSON/);
});

test("parses simple YAML policy packs", () => {
  const parsed = parsePolicyDocument(`
policy:
  id: code.repository.merge.v1
  version: 1.0.0
rules:
  - id: require-capability
    effect: allow
    condition: agent.capabilities.includes('repo.merge')
`);

  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.document?.policy?.id, "code.repository.merge.v1");
  assert.equal(Array.isArray(parsed.document?.rules), true);
});

test("creates a sample policy with configured id", () => {
  const sample = createSamplePolicy("finance.payment.refund.v1");
  const parsed = JSON.parse(sample);

  assert.equal(parsed.policy.id, "finance.payment.refund.v1");
  assert.equal(parsed.rules[0].effect, "allow");
});

test("exposes useful completion keys", () => {
  assert.equal(policyKeyCompletions.includes("policy"), true);
  assert.equal(policyKeyCompletions.includes("condition"), true);
});
