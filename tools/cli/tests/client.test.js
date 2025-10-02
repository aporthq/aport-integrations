const APortClient = require("../src/client");

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("APortClient", () => {
  let client;
  const mockApiKey = "test-api-key";
  const mockBaseUrl = "https://api.aport.io";

  beforeEach(() => {
    process.env.APORT_API_KEY = mockApiKey;
    client = new APortClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with environment variables", () => {
      expect(client.apiKey).toBe(mockApiKey);
      expect(client.baseUrl).toBe(mockBaseUrl);
    });

    it("should throw error if no API key provided", () => {
      delete process.env.APORT_API_KEY;
      expect(() => new APortClient()).toThrow(
        "APORT_API_KEY environment variable is required"
      );
    });

    it("should use custom options when provided", () => {
      const customClient = new APortClient({
        apiKey: "custom-key",
        baseUrl: "https://custom.api.com",
      });
      expect(customClient.apiKey).toBe("custom-key");
      expect(customClient.baseUrl).toBe("https://custom.api.com");
    });
  });

  describe("verify", () => {
    it("should verify agent successfully", async () => {
      const mockResponse = {
        data: {
          verified: true,
          passport: { agent_id: "test-agent" },
        },
      };
      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await client.verify("payments.refund.v1", "test-agent", {
        amount: 100,
      });

      expect(result.verified).toBe(true);
      expect(result.passport.agent_id).toBe("test-agent");
    });

    it("should handle API errors", async () => {
      const mockError = {
        response: {
          data: { message: "Agent not found" },
          statusText: "Not Found",
        },
      };
      axios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(mockError),
      });

      await expect(
        client.verify("payments.refund.v1", "invalid-agent")
      ).rejects.toThrow("API Error: Agent not found");
    });

    it("should handle network errors", async () => {
      const mockError = new Error("Network Error");
      axios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(mockError),
      });

      await expect(
        client.verify("payments.refund.v1", "test-agent")
      ).rejects.toThrow("Network Error: Network Error");
    });
  });

  describe("createPassport", () => {
    it("should create passport successfully", async () => {
      const mockPassportData = {
        name: "Test Agent",
        role: "Test Role",
      };
      const mockResponse = {
        data: {
          agent_id: "agt_inst_test_123",
          ...mockPassportData,
        },
      };
      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await client.createPassport(mockPassportData);

      expect(result.agent_id).toBe("agt_inst_test_123");
      expect(result.name).toBe("Test Agent");
    });
  });

  describe("getPassport", () => {
    it("should get passport successfully", async () => {
      const mockResponse = {
        data: {
          agent_id: "agt_inst_test_123",
          name: "Test Agent",
        },
      };
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await client.getPassport("agt_inst_test_123");

      expect(result.agent_id).toBe("agt_inst_test_123");
      expect(result.name).toBe("Test Agent");
    });
  });

  describe("suspendPassport", () => {
    it("should suspend passport successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "Passport suspended",
        },
      };
      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await client.suspendPassport(
        "agt_inst_test_123",
        "Test suspension"
      );

      expect(result.success).toBe(true);
    });
  });
});
