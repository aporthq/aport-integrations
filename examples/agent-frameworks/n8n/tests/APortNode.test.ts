import { APortNode } from "../src/APortNode";
import { INodeExecutionData } from "n8n-workflow";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("APortNode", () => {
  let node: APortNode;

  beforeEach(() => {
    node = new APortNode();
  });

  it("should verify agent successfully", async () => {
    const items: INodeExecutionData[] = [{ json: {} }];

    mockedAxios.post.mockResolvedValue({
      data: {
        verified: true,
        passport: { agent_id: "agt_test" },
        message: "Verified",
        decision: { allow: true },
      },
    });

    const result = await node.execute(items);

    expect(result).toHaveLength(1);
    expect(result[0].json.verified).toBe(true);
    expect(result[0].json.passport.agent_id).toBe("agt_test");
    expect(result[0].json.message).toBe("Verified");
  });

  it("should handle invalid JSON context", async () => {
    const items: INodeExecutionData[] = [{ json: {} }];

    // Override getNodeParameter to return invalid JSON for context
    jest.spyOn(node, "getNodeParameter").mockImplementation((name) => {
      if (name === "context") return "{invalid_json";
      if (name === "agentId") return "agt_test";
      if (name === "policyPack") return "finance.payment.refund.v1";
      if (name === "baseUrl") return "https://aport.io";
      if (name === "apiKey") return "";
      return "";
    });

    const result = await node.execute(items);

    expect(result).toHaveLength(1);
    expect(result[0].json.error).toBe("Invalid JSON in context");
  });

  it("should handle verification failure", async () => {
    const items: INodeExecutionData[] = [{ json: {} }];

    mockedAxios.post.mockRejectedValue(new Error("Network error"));

    // Override getNodeParameter to return valid parameters
    jest.spyOn(node, "getNodeParameter").mockImplementation((name) => {
      if (name === "context") return "{}";
      if (name === "agentId") return "agt_test";
      if (name === "policyPack") return "finance.payment.refund.v1";
      if (name === "baseUrl") return "https://aport.io";
      if (name === "apiKey") return "";
      return "";
    });

    const result = await node.execute(items);

    expect(result).toHaveLength(1);
    expect(result[0].json.error).toBe("Verification failed");
  });
});
