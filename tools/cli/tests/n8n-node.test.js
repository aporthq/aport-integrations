const { nodeClass: APortVerifyNode } = require("../examples/n8n-node");
const APortClient = require("../src/client");

jest.mock("../src/client");

describe("APortVerifyNode", () => {
  let node;
  let clientMock;

  beforeEach(() => {
    clientMock = {
      verify: jest.fn(),
    };
    APortClient.mockImplementation(() => clientMock);
    node = new APortVerifyNode();
  });

  test("should verify agent successfully and output on main output", async () => {
    clientMock.verify.mockResolvedValue({
      data: {
        decision: {
          allow: true,
          decision_id: "dec123",
          reasons: [],
        },
      },
      passport: { agent_id: "agt123" },
    });

    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (param, index) => {
      if (param === "agentId") return "agt123";
      if (param === "policy") return "finance.payment.refund.v1";
      if (param === "context") return {};
      if (param === "apiKey") return "";
      if (param === "baseUrl") return "https://aport.io";
      return null;
    };

    const [mainOutput, errorOutput] = await node.execute();

    expect(mainOutput[0]).toEqual({
      json: {
        verified: true,
        agentId: "agt123",
        policy: "finance.payment.refund.v1",
        decision: {
          allow: true,
          decision_id: "dec123",
          reasons: [],
        },
        passport: { agent_id: "agt123" },
      },
    });
    expect(errorOutput[0]).toBeNull();
  });

  test("should output error on second output if verification fails", async () => {
    clientMock.verify.mockResolvedValue({
      data: {
        decision: {
          allow: false,
          decision_id: "dec456",
          reasons: [{ code: "fail", message: "Not allowed" }],
        },
      },
      reason: "Verification failed",
    });

    node.getInputData = () => [{}];
    node.getNodeParameter = (param, index) => {
      if (param === "agentId") return "agt456";
      if (param === "policy") return "finance.payment.refund.v1";
      if (param === "context") return {};
      if (param === "apiKey") return "";
      if (param === "baseUrl") return "https://aport.io";
      return null;
    };

    const [mainOutput, errorOutput] = await node.execute();

    expect(mainOutput[0]).toBeNull();
    expect(errorOutput[0]).toEqual({
      json: {
        verified: false,
        agentId: "agt456",
        policy: "finance.payment.refund.v1",
        decision: {
          allow: false,
          decision_id: "dec456",
          reasons: [{ code: "fail", message: "Not allowed" }],
        },
        reason: "Verification failed",
      },
    });
  });

  test("should output error on second output if exception thrown", async () => {
    clientMock.verify.mockRejectedValue(new Error("Network error"));

    node.getInputData = () => [{}];
    node.getNodeParameter = (param, index) => {
      if (param === "agentId") return "agt789";
      if (param === "policy") return "finance.payment.refund.v1";
      if (param === "context") return {};
      if (param === "apiKey") return "";
      if (param === "baseUrl") return "https://aport.io";
      return null;
    };

    const [mainOutput, errorOutput] = await node.execute();

    expect(mainOutput[0]).toBeNull();
    expect(errorOutput[0]).toEqual({
      json: {
        error: "Network error",
      },
    });
  });
});
