import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePolicyDocument } from "../src/policyValidation";

const validPolicy = JSON.stringify({
  id: "finance.payment.refund.v1",
  name: "Refund Approval Policy",
  version: "1.0.0",
  description: "Controls agent-initiated refunds.",
  rules: [
    {
      id: "small-refund",
      effect: "allow",
      action: "refund.create",
      conditions: {
        amount: { lte: 50 },
      },
    },
  ],
});

describe("validatePolicyDocument", () => {
  it("accepts a valid JSON policy pack", () => {
    assert.deepEqual(validatePolicyDocument(validPolicy, "refund.aport-policy.json"), []);
  });

  it("reports invalid JSON", () => {
    const diagnostics = validatePolicyDocument("{", "broken.aport-policy.json");

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, "error");
    assert.match(diagnostics[0].message, /Invalid JSON/);
  });

  it("requires root policy fields", () => {
    const diagnostics = validatePolicyDocument("{}", "empty.aport-policy.json");

    assert.deepEqual(
      diagnostics.map((diagnostic) => diagnostic.message),
      [
        'Missing required field "id".',
        'Missing required field "name".',
        'Missing required field "version".',
        'Missing required field "description".',
        'Missing required field "rules".',
      ]
    );
  });

  it("reports invalid rule effects", () => {
    const policy = JSON.parse(validPolicy);
    policy.rules[0].effect = "maybe";

    const diagnostics = validatePolicyDocument(JSON.stringify(policy), "refund.aport-policy.json");

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, "error");
    assert.equal(diagnostics[0].message, 'Rule effect must be one of "allow", "deny", or "review".');
  });

  it("validates YAML policy essentials without requiring a YAML parser", () => {
    const diagnostics = validatePolicyDocument(
      [
        "id: data.export.v1",
        "name: Data Export Policy",
        "version: 1.0.0",
        "description: Controls data exports.",
        "rules:",
        "  - id: small-export",
        "    effect: allow",
        "    action: data.export",
      ].join("\n"),
      "data.aport-policy.yaml"
    );

    assert.deepEqual(diagnostics, []);
  });

  it("reports invalid YAML rule effects", () => {
    const diagnostics = validatePolicyDocument(
      [
        "id: data.export.v1",
        "name: Data Export Policy",
        "version: 1.0.0",
        "description: Controls data exports.",
        "rules:",
        "  - id: small-export",
        "    effect: maybe",
        "    action: data.export",
      ].join("\n"),
      "data.aport-policy.yaml"
    );

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].message, 'Rule effect must be one of "allow", "deny", or "review".');
  });

  it("does not treat YAML keys ending in effect as rule effects", () => {
    const diagnostics = validatePolicyDocument(
      [
        "id: data.export.v1",
        "name: Data Export Policy",
        "version: 1.0.0",
        "description: Controls data exports.",
        "rules:",
        "  - id: small-export",
        "    effect: allow",
        "    action: data.export",
        "metadata:",
        "  side_effect: documented",
      ].join("\n"),
      "data.aport-policy.yaml"
    );

    assert.deepEqual(diagnostics, []);
  });

  it("requires rule ids inside the YAML rules section", () => {
    const diagnostics = validatePolicyDocument(
      [
        "id: data.export.v1",
        "name: Data Export Policy",
        "version: 1.0.0",
        "description: Controls data exports.",
        "metadata:",
        "  - id: metadata-item",
        "rules:",
      ].join("\n"),
      "data.aport-policy.yaml"
    );

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].message, "Policy pack must define at least one rule with an id.");
  });
});
