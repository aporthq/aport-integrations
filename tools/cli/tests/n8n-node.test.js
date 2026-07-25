const { APortVerifyNode } = require("../src/n8n-node");
const { NodeOperationError } = require("n8n-workflow");

describe("APortVerifyNode", () => {
  let node;

  beforeEach(() => {
    node = new APortVerifyNode();
  });

  test("should have correct description", () => {
    expect(node.description).toBeDefined();
    expect(node.description.name).toBe("aportVerify");
    expect(node.description.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "agentId" }),
        expect.objectContaining({ name: "policy" }),
        expect.objectContaining({ name: "context" }),
        expect.objectContaining({ name: "apiKey" }),
      ])
    );
  });

  test("should throw error on invalid JSON context", async () => {
    node.getInputData = () => [
      { json: {} },
    ];
    node.getNodeParameter = (name, index) => {
      if (name === "agentId") return "test-agent";
      if (name === "policy") return "finance.payment.refund.v1";
      if (name === "context") return "{invalid-json}";
      if (name === "apiKey") return "";
      return undefined;
    };
    node.getNode = () => ({});

    await expect(node.execute()).rejects.toThrow("Invalid JSON in context parameter");
  });

  test("should verify agent successfully", async () => {
    node.getInputData = () => [
      { json: {} },
    ];
    node.getNodeParameter = (name, index) => {
      if (name === "agentId") return "test-agent";
      if (name === "policy") return "finance.payment.refund.v1";
      if (name === "context") return "{}";
      if (name === "apiKey") return "";
      return undefined;
    };
    node.getNode = () => ({});

    // Mock APortClient.verify
    const mockVerify = jest.fn().mockResolvedValue({
      verified: true,
      data: { decision: { allow: true } },
      passport: { agent_id: "test-agent" },
      message: "Verified",
    });
    const mockClient = {
      verify: mockVerify,
    };
    const originalClient = require("../src/client");
    jest.spyOn(require.cache, "require").mockImplementation(() => mockClient);
    jest.mock("../src/client", () => {
      return jest.fn().mockImplementation(() => mockClient);
    });

    // Replace APortClient in node module
    node.__proto__.constructor = class {
      constructor() {
        this.verify = mockVerify;
      }
    };

    // Patch client creation in node
    const APortClient = require("../src/client");
    APortClient.mockImplementation(() => mockClient);

    const result = await node.execute();

    expect(result).toHaveLength(1);
    expect(result[0].json.verified).toBe(true);
    expect(result[0].json.agentId).toBe("test-agent");
  });

  test("should throw error on verification failure", async () => {
    node.getInputData = () => [
      { json: {} },
    ];
    node.getNodeParameter = (name, index) => {
      if (name === "agentId") return "test-agent";
      if (name === "policy") return "finance.payment.refund.v1";
      if (name === "context") return "{}";
      if (name === "apiKey") return "";
      return undefined;
    };
    node.getNode = () => ({});

    // Mock APortClient.verify to throw error
    const mockVerify = jest.fn().mockRejectedValue(new Error("API Error"));
    const mockClient = {
      verify: mockVerify,
    };
    jest.mock("../src/client", () => {
      return jest.fn().mockImplementation(() => mockClient);
    });

    await expect(node.execute()).rejects.toThrow("Verification failed: API Error");
  });
});
