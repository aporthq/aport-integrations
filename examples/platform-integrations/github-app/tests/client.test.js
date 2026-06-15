const APortClient = require("../src/client");

// --- APortClient ---
describe("APortClient", () => {
  describe("constructor", () => {
    test("should initialize with default options", () => {
      const client = new APortClient();
      expect(client.baseUrl).toBe("https://aport.io");
      expect(client.apiKey).toBeUndefined();
    });

    test("should initialize with custom options", () => {
      const client = new APortClient({
        apiKey: "test-key",
        baseUrl: "https://custom.aport.io",
      });
      expect(client.apiKey).toBe("test-key");
      expect(client.baseUrl).toBe("https://custom.aport.io");
    });

    test("should set Authorization header when API key provided", () => {
      const client = new APortClient({ apiKey: "test-key" });
      expect(client.client.defaults.headers.Authorization).toBe(
        "Bearer test-key"
      );
    });

    test("should not set Authorization header without API key", () => {
      const client = new APortClient();
      expect(client.client.defaults.headers.Authorization).toBeUndefined();
    });

    test("should use default base URL when not provided", () => {
      const client = new APortClient();
      expect(client.baseUrl).toBe("https://aport.io");
    });

    test("should configure 10 second timeout", () => {
      const client = new APortClient();
      expect(client.client.defaults.timeout).toBe(10000);
    });

    test("should set Content-Type header to application/json", () => {
      const client = new APortClient();
      expect(client.client.defaults.headers["Content-Type"]).toBe(
        "application/json"
      );
    });
  });

  describe("verify", () => {
    test("should be a function", () => {
      const client = new APortClient();
      expect(typeof client.verify).toBe("function");
    });

    test("should call the correct API endpoint with agent_id and policy", async () => {
      const client = new APortClient({ apiKey: "test-key" });
      const mockPost = jest.fn().mockResolvedValue({
        data: { verified: true, decision: { allow: true } },
      });
      client.client.post = mockPost;

      await client.verify("code.repository.merge.v1", "test-agent", {
        repo: "test/repo",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/api/verify/policy/code.repository.merge.v1",
        {
          context: {
            agent_id: "test-agent",
            policy_id: "code.repository.merge.v1",
            context: { repo: "test/repo" },
          },
        }
      );
    });

    test("should handle network errors", async () => {
      const client = new APortClient();
      client.client.post = jest
        .fn()
        .mockRejectedValue(new Error("Network timeout"));

      await expect(
        client.verify("policy.v1", "agent123")
      ).rejects.toThrow("Network Error: Network timeout");
    });

    test("should handle API error responses", async () => {
      const client = new APortClient();
      client.client.post = jest.fn().mockRejectedValue({
        response: { data: { message: "Policy not found" }, statusText: "Not Found" },
      });

      await expect(
        client.verify("unknown.policy.v1", "agent123")
      ).rejects.toThrow("API Error: Policy not found");
    });
  });

  describe("getPassport", () => {
    test("should return passport data when API returns agent_id", async () => {
      const client = new APortClient();
      client.client.get = jest.fn().mockResolvedValue({
        data: { agent_id: "agt_123", name: "Test Agent", status: "active" },
      });

      const result = await client.getPassport("agt_123");
      expect(result.agent_id).toBe("agt_123");
      expect(result.name).toBe("Test Agent");
    });

    test("should throw when no API key and getPassport falls through", async () => {
      const client = new APortClient();
      // First call (verify endpoint) fails without response
      client.client.get = jest.fn().mockRejectedValue(new Error("Not found"));

      // apiKey is undefined, so it will throw the "API key required" error
      await expect(client.getPassport("agt_123")).rejects.toThrow(
        "API key required for passport retrieval."
      );
    });
  });

  describe("listPolicies", () => {
    test("should return policies array", async () => {
      const client = new APortClient();
      client.client.get = jest.fn().mockResolvedValue({
        data: [
          { id: "finance.payment.refund.v1", name: "Refund Policy" },
          { id: "code.repository.merge.v1", name: "Merge Policy" },
        ],
      });

      const result = await client.listPolicies();
      expect(result).toHaveLength(2);
    });

    test("should handle API errors", async () => {
      const client = new APortClient();
      client.client.get = jest.fn().mockRejectedValue({
        response: { data: { message: "Unauthorized" }, statusText: "Unauthorized" },
      });

      await expect(client.listPolicies()).rejects.toThrow(
        "API Error: Unauthorized"
      );
    });
  });
});
