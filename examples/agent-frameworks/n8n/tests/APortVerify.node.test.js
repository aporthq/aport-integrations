const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { APortVerify } = require("../nodes/APortVerify/APortVerify.node");

function createExecutionContext({ parameters = {}, response, input = {} }) {
  const calls = [];
  const httpRequest = async (options) => {
    calls.push(options);
    return response;
  };

  httpRequest.calls = calls;

  return {
    getInputData: () => [
      {
        json: input,
      },
    ],
    getCredentials: async () => ({
      apiKey: "test-api-key",
      baseUrl: "https://aport.io/",
    }),
    getNodeParameter: (name, _itemIndex, defaultValue) => {
      if (Object.prototype.hasOwnProperty.call(parameters, name)) {
        return parameters[name];
      }
      return defaultValue;
    },
    helpers: {
      httpRequest,
    },
  };
}

describe("APortVerify node", () => {
  it("declares three routing outputs", () => {
    const node = new APortVerify();

    assert.deepEqual(node.description.outputs, ["main", "main", "main"]);
    assert.deepEqual(node.description.outputNames, [
      "Approved",
      "Denied",
      "Error",
    ]);
  });

  it("routes approved verification responses to the first output", async () => {
    const node = new APortVerify();
    const context = createExecutionContext({
      input: {
        agent_id: "agt_test_123",
        amount: 42,
      },
      parameters: {
        passportId: "agt_test_123",
        policyPack: "finance.payment.refund.v1",
        contextMode: "input",
        includeInputData: true,
      },
      response: {
        verified: true,
      },
    });

    const [approved, denied, errors] = await node.execute.call(context);

    assert.equal(approved.length, 1);
    assert.equal(denied.length, 0);
    assert.equal(errors.length, 0);
    assert.equal(approved[0].json.aport.approved, true);
    assert.equal(context.helpers.httpRequest.calls[0].method, "POST");
    assert.equal(
      context.helpers.httpRequest.calls[0].url,
      "https://aport.io/api/verify/policy/finance.payment.refund.v1"
    );
  });

  it("routes denied verification responses to the second output", async () => {
    const node = new APortVerify();
    const context = createExecutionContext({
      parameters: {
        passportId: "agt_test_123",
        policyPack: "finance.payment.refund.v1",
        contextMode: "json",
        contextJson: "{\"amount\":42}",
        includeInputData: false,
      },
      response: {
        decision: "deny",
      },
    });

    const [approved, denied, errors] = await node.execute.call(context);

    assert.equal(approved.length, 0);
    assert.equal(denied.length, 1);
    assert.equal(errors.length, 0);
    assert.deepEqual(denied[0].json, {
      aport: {
        approved: false,
        passportId: "agt_test_123",
        policyPack: "finance.payment.refund.v1",
        response: {
          decision: "deny",
        },
      },
    });
  });

  it("routes node configuration errors to the third output", async () => {
    const node = new APortVerify();
    const context = createExecutionContext({
      input: {
        action: "refund",
      },
      parameters: {
        passportId: "",
        policyPack: "finance.payment.refund.v1",
        includeInputData: true,
      },
      response: {},
    });

    const [approved, denied, errors] = await node.execute.call(context);

    assert.equal(approved.length, 0);
    assert.equal(denied.length, 0);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].json.aport.error, "Passport ID is required.");
  });
});
