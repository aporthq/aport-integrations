const request = require("supertest");
const express = require("express");
const { createAPortMiddleware } = require("../src");

// Mock APort client
jest.mock("@aporthq/sdk-node", () => ({
  APortClient: jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
  })),
}));

const { APortClient } = require("@aporthq/sdk-node");

describe("APort Express Middleware", () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockClient = {
      verify: jest.fn(),
    };
    APortClient.mockImplementation(() => mockClient);

    const aportMiddleware = createAPortMiddleware({
      apiKey: "test-key",
    });

    // Test routes
    app.get("/public", (req, res) => {
      res.json({ message: "public" });
    });

    app.post(
      "/refund",
      aportMiddleware("finance.payment.refund.v1"),
      (req, res) => {
        res.json({
          success: true,
          agentId: req.aport.agentId,
        });
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Public endpoints", () => {
    it("should allow access to public endpoints", async () => {
      const response = await request(app).get("/public").expect(200);

      expect(response.body.message).toBe("public");
    });
  });

  describe("Protected endpoints", () => {
    it("should verify agent successfully", async () => {
      mockClient.verify.mockResolvedValue({
        verified: true,
        passport: {
          capabilities: ["refund"],
          limits: {
            refund_amount_max_per_tx: 1000,
          },
        },
      });

      const response = await request(app)
        .post("/refund")
        .set("X-Agent-ID", "agt_test123")
        .send({ amount: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agentId).toBe("agt_test123");
      expect(mockClient.verify).toHaveBeenCalledWith(
        "finance.payment.refund.v1",
        "agt_test123",
        expect.any(Object)
      );
    });

    it("should reject unverified agents", async () => {
      mockClient.verify.mockResolvedValue({
        verified: false,
        message: "Agent not authorized",
      });

      const response = await request(app)
        .post("/refund")
        .set("X-Agent-ID", "agt_unauthorized")
        .send({ amount: 100 })
        .expect(403);

      expect(response.body.error).toBe("Verification failed");
      expect(response.body.message).toBe("Agent not authorized");
    });

    it("should require agent ID", async () => {
      const response = await request(app)
        .post("/refund")
        .send({ amount: 100 })
        .expect(400);

      expect(response.body.error).toBe("Agent ID required");
    });

    it("should handle verification errors", async () => {
      mockClient.verify.mockRejectedValue(new Error("API Error"));

      const response = await request(app)
        .post("/refund")
        .set("X-Agent-ID", "agt_test123")
        .send({ amount: 100 })
        .expect(500);

      expect(response.body.error).toBe("Verification error");
    });
  });

  describe("Agent ID extraction", () => {
    it("should extract agent ID from headers", async () => {
      mockClient.verify.mockResolvedValue({
        verified: true,
        passport: {},
      });

      await request(app)
        .post("/refund")
        .set("X-Agent-ID", "agt_header123")
        .send({ amount: 100 })
        .expect(200);

      expect(mockClient.verify).toHaveBeenCalledWith(
        "finance.payment.refund.v1",
        "agt_header123",
        expect.any(Object)
      );
    });

    it("should extract agent ID from query params", async () => {
      mockClient.verify.mockResolvedValue({
        verified: true,
        passport: {},
      });

      await request(app)
        .post("/refund?agent_id=agt_query123")
        .send({ amount: 100 })
        .expect(200);

      expect(mockClient.verify).toHaveBeenCalledWith(
        "finance.payment.refund.v1",
        "agt_query123",
        expect.any(Object)
      );
    });

    it("should extract agent ID from body", async () => {
      mockClient.verify.mockResolvedValue({
        verified: true,
        passport: {},
      });

      await request(app)
        .post("/refund")
        .send({
          amount: 100,
          agent_id: "agt_body123",
        })
        .expect(200);

      expect(mockClient.verify).toHaveBeenCalledWith(
        "finance.payment.refund.v1",
        "agt_body123",
        expect.any(Object)
      );
    });
  });
});
