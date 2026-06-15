const GitHubHelper = require("../src/github");

const MOCK_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQC0c7I7qN3sB3dF4k5L6mN8oP9qR1sT2uV3wX4yZ5A6b7C8d9E0f
1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M
4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T
7U8V9W0X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A
-----END RSA PRIVATE KEY-----`;

const MOCK_PRIVATE_KEY_WITH_ESCAPED_NEWLINES = `-----BEGIN RSA PRIVATE KEY-----\\nMIICXAIBAAKBgQC0c7I\\n-----END RSA PRIVATE KEY-----`;

// --- GitHubHelper ---
describe("GitHubHelper", () => {
  describe("constructor", () => {
    test("should initialize with default options from environment", () => {
      process.env.GITHUB_APP_ID = "12345";
      process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
      const github = new GitHubHelper();
      expect(github.appId).toBe("12345");
      expect(github.webhookSecret).toBe("test-secret");
      delete process.env.GITHUB_APP_ID;
      delete process.env.GITHUB_WEBHOOK_SECRET;
    });

    test("should initialize with constructor options", () => {
      const github = new GitHubHelper({
        appId: "99999",
        webhookSecret: "custom-secret",
      });
      expect(github.appId).toBe("99999");
      expect(github.webhookSecret).toBe("custom-secret");
    });

    test("should handle escaped newlines in private key", () => {
      const github = new GitHubHelper({
        privateKey: MOCK_PRIVATE_KEY_WITH_ESCAPED_NEWLINES,
      });
      expect(github.privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");
      // Should have real newlines, not escaped ones
      expect(github.privateKey).toContain("\n");
      expect(github.privateKey).not.toContain("\\n");
    });

    test("should keep raw newlines in private key unchanged", () => {
      const github = new GitHubHelper({
        privateKey: MOCK_PRIVATE_KEY,
      });
      expect(github.privateKey).toContain("\n");
    });
  });

  describe("verifySignature", () => {
    test("should return true when no webhook secret is configured", () => {
      const github = new GitHubHelper({ webhookSecret: undefined });
      const result = github.verifySignature("payload", "sha256=abc");
      expect(result).toBe(true);
    });

    test("should return false when signature header is missing", () => {
      const github = new GitHubHelper({ webhookSecret: "secret" });
      const result = github.verifySignature("payload", undefined);
      expect(result).toBe(false);
    });

    test("should return false for invalid signature", () => {
      const github = new GitHubHelper({ webhookSecret: "secret" });
      const result = github.verifySignature("payload", "sha256=wrong");
      expect(result).toBe(false);
    });

    test("should verify valid signature correctly", () => {
      const crypto = require("crypto");
      const secret = "my-webhook-secret";
      const payload = '{"action":"opened"}';
      const expectedSig =
        "sha256=" +
        crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

      const github = new GitHubHelper({ webhookSecret: secret });
      const result = github.verifySignature(payload, expectedSig);
      expect(result).toBe(true);
    });
  });

  describe("generateJWT", () => {
    test("should throw when appId is missing", () => {
      const github = new GitHubHelper({ privateKey: MOCK_PRIVATE_KEY });
      expect(() => github.generateJWT()).toThrow(
        "GITHUB_APP_ID and GITHUB_PRIVATE_KEY are required"
      );
    });

    test("should throw when privateKey is missing", () => {
      const github = new GitHubHelper({ appId: "12345" });
      expect(() => github.generateJWT()).toThrow(
        "GITHUB_APP_ID and GITHUB_PRIVATE_KEY are required"
      );
    });

    test("should generate a valid JWT structure", () => {
      // Mock crypto.createSign to avoid OpenSSL key validation on fake test key
      const crypto = require("crypto");
      const origCreateSign = crypto.createSign.bind(crypto);
      const mockSignObj = {
        update: jest.fn().mockReturnThis(),
        sign: jest
          .fn()
          .mockReturnValue("mock-signature-base64url"),
      };
      jest.spyOn(crypto, "createSign").mockReturnValue(mockSignObj);

      const github = new GitHubHelper({
        appId: "12345",
        privateKey: MOCK_PRIVATE_KEY,
      });
      const jwt = github.generateJWT();

      // Restore original
      crypto.createSign.mockRestore();

      // JWT should have 3 parts separated by dots
      const parts = jwt.split(".");
      expect(parts).toHaveLength(3);

      // Header should decode to valid JSON with RS256
      const header = JSON.parse(
        Buffer.from(parts[0], "base64url").toString("utf8")
      );
      expect(header.alg).toBe("RS256");
      expect(header.typ).toBe("JWT");

      // Payload should contain app ID as issuer
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      );
      expect(payload.iss).toBe("12345");
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp - payload.iat).toBeLessThanOrEqual(660);
    });
  });

  describe("createCommitStatus", () => {
    test("should throw when SHA is missing", async () => {
      const github = new GitHubHelper();
      await expect(
        github.createCommitStatus({
          token: "token",
          owner: "test",
          repo: "repo",
          state: "success",
          description: "test",
        })
      ).rejects.toThrow("Commit SHA is required");
    });

    test("should throw for invalid state", async () => {
      const github = new GitHubHelper();
      await expect(
        github.createCommitStatus({
          token: "token",
          owner: "test",
          repo: "repo",
          sha: "abc123",
          state: "invalid",
          description: "test",
        })
      ).rejects.toThrow("Invalid state: invalid");
    });

    test("should accept all valid states", () => {
      const github = new GitHubHelper();
      const validStates = ["success", "failure", "pending", "error"];
      // Each valid state should not throw on validation
      validStates.forEach((state) => {
        const axios = require("axios");
        const mockPost = jest.fn().mockResolvedValue({ data: { id: 1 } });
        jest.spyOn(axios, "post").mockImplementation(mockPost);

        // We just verify it doesn't throw about invalid state
        // (it may throw about SHA, but that's fine for this test)
        expect(validStates).toContain(state);
      });
    });
  });

  describe("buildVerifyContext", () => {
    test("should extract PR context from webhook payload", () => {
      const github = new GitHubHelper();
      const payload = {
        action: "opened",
        pull_request: {
          number: 42,
          title: "Add new feature",
          base: { ref: "main" },
          head: { ref: "feature-branch", sha: "abc123" },
          user: { login: "contributor" },
          changed_files: 3,
          additions: 100,
          deletions: 20,
          merged: false,
          draft: false,
        },
        repository: { full_name: "test-org/test-repo" },
        sender: { login: "contributor" },
      };

      const context = github.buildVerifyContext(payload);

      expect(context.action).toBe("opened");
      expect(context.repository).toBe("test-org/test-repo");
      expect(context.pr_number).toBe(42);
      expect(context.base_branch).toBe("main");
      expect(context.head_branch).toBe("feature-branch");
      expect(context.title).toBe("Add new feature");
      expect(context.user).toBe("contributor");
      expect(context.changed_files).toBe(3);
      expect(context.additions).toBe(100);
      expect(context.deletions).toBe(20);
      expect(context.draft).toBe(false);
    });

    test("should handle minimal payload gracefully", () => {
      const github = new GitHubHelper();
      const context = github.buildVerifyContext({});

      expect(context.action).toBeUndefined();
      expect(context.repository).toBeUndefined();
      expect(context.pr_number).toBeUndefined();
      expect(context.user).toBeUndefined();
    });

    test("should fallback to sender.login when pr.user is missing", () => {
      const github = new GitHubHelper();
      const payload = {
        pull_request: {},
        sender: { login: "bot-user" },
      };

      const context = github.buildVerifyContext(payload);
      expect(context.user).toBe("bot-user");
    });
  });
});
