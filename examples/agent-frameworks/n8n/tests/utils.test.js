const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  buildContext,
  isApproved,
  normalizeBaseUrl,
  parseContextValue,
} = require("../nodes/APortVerify/utils");

describe("APort Verify utilities", () => {
  it("normalizes trailing slashes from base URLs", () => {
    assert.equal(normalizeBaseUrl("https://aport.io///"), "https://aport.io");
  });

  it("builds context from input JSON", () => {
    assert.deepEqual(
      buildContext({
        mode: "input",
        inputJson: {
          amount: 25,
          action: "refund",
        },
      }),
      {
        amount: 25,
        action: "refund",
      }
    );
  });

  it("builds context from JSON object configuration", () => {
    assert.deepEqual(
      buildContext({
        mode: "json",
        contextJson: "{\"amount\":25,\"action\":\"refund\"}",
      }),
      {
        amount: 25,
        action: "refund",
      }
    );
  });

  it("accepts pre-parsed JSON object configuration", () => {
    assert.deepEqual(
      buildContext({
        mode: "json",
        contextJson: {
          amount: 25,
          action: "refund",
        },
      }),
      {
        amount: 25,
        action: "refund",
      }
    );
  });

  it("builds context from key-value fields and parses JSON-looking values", () => {
    assert.deepEqual(
      buildContext({
        mode: "fields",
        fields: {
          field: [
            {
              key: "amount",
              value: "25",
            },
            {
              key: "metadata",
              value: "{\"source\":\"n8n\"}",
            },
          ],
        },
      }),
      {
        amount: 25,
        metadata: {
          source: "n8n",
        },
      }
    );
  });

  it("keeps plain strings as strings", () => {
    assert.equal(parseContextValue("refund"), "refund");
  });

  it("detects approved responses from common APort shapes", () => {
    assert.equal(isApproved({ verified: true }), true);
    assert.equal(isApproved({ decision: "allow" }), true);
    assert.equal(isApproved({ status: "approved" }), true);
    assert.equal(isApproved({ decision: "deny" }), false);
  });
});
