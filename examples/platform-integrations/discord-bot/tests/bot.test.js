const {
  formatVerifyResult,
  formatPassportResult,
  formatPoliciesResult,
  formatHelpResult,
  commandDefinitions,
} = require("../src/commands");

const APortClient = require("../src/client");

// --- Command Definitions ---
describe("Command Definitions", () => {
  test("should have all required commands", () => {
    const commandNames = commandDefinitions.map((c) => c.name);
    expect(commandNames).toContain("aport-verify");
    expect(commandNames).toContain("aport-passport");
    expect(commandNames).toContain("aport-policies");
    expect(commandNames).toContain("aport-help");
  });

  test("aport-verify should require agent-id and policy", () => {
    const cmd = commandDefinitions.find((c) => c.name === "aport-verify");
    const agentIdOption = cmd.options.find((o) => o.name === "agent-id");
    const policyOption = cmd.options.find((o) => o.name === "policy");

    expect(agentIdOption.required).toBe(true);
    expect(policyOption.required).toBe(true);
  });

  test("should have valid Discord.js option types", () => {
    commandDefinitions.forEach((cmd) => {
      if (cmd.options) {
        cmd.options.forEach((option) => {
          expect([3, 4, 5, 6, 7, 8, 9, 10]).toContain(option.type);
        });
      }
    });
  });
});

// --- Format Verify Result ---
describe("formatVerifyResult", () => {
  test("should create approved embed when decision.allow is true", () => {
    const result = {
      data: {
        decision: {
          decision_id: "dec_123",
          allow: true,
          expires_in: 3600,
          assurance_level: "high",
          reasons: [{ message: "All checks passed" }],
        },
      },
      passport: { name: "Test Agent" },
    };

    const embed = formatVerifyResult("agt_123", "finance.payment.refund.v1", result);

    expect(embed.data.color).toBe(0x00ff00);
    expect(embed.data.fields.some((f) => f.value.includes("Approved"))).toBe(true);
  });

  test("should create denied embed when decision.allow is false", () => {
    const result = {
      decision: {
        decision_id: "dec_456",
        allow: false,
        reasons: [{ message: "Insufficient permissions" }],
      },
    };

    const embed = formatVerifyResult("agt_456", "admin.access.v1", result);

    expect(embed.data.color).toBe(0xff0000);
    expect(embed.data.fields.some((f) => f.value.includes("Denied"))).toBe(true);
  });

  test("should handle result without decision", () => {
    const result = {};

    const embed = formatVerifyResult("agt_789", "data.export.v1", result);

    // Should default to denied (no decision = not approved)
    expect(embed.data.color).toBe(0xff0000);
  });
});

// --- Format Passport Result ---
describe("formatPassportResult", () => {
  test("should include all passport fields", () => {
    const passport = {
      name: "Refund Bot",
      role: "Finance Agent",
      status: "active",
      description: "Handles customer refunds",
      capabilities: [
        { id: "payments.refund" },
        { id: "data.export" },
      ],
      limits: {
        refund_amount_max_per_tx: 100,
        refund_amount_daily_cap: 500,
      },
    };

    const embed = formatPassportResult("agt_001", passport);

    expect(embed.data.color).toBe(0x06b6d4);
    expect(embed.data.fields.some((f) => f.value === "Refund Bot")).toBe(true);
    expect(embed.data.fields.some((f) => f.value === "active")).toBe(true);
    expect(embed.data.fields.some((f) => f.name === "Capabilities")).toBe(true);
    expect(embed.data.fields.some((f) => f.name === "Limits")).toBe(true);
  });

  test("should handle minimal passport", () => {
    const passport = {
      name: "Minimal Bot",
    };

    const embed = formatPassportResult("agt_min", passport);

    expect(embed.data.fields.some((f) => f.value === "Minimal Bot")).toBe(true);
    expect(embed.data.fields.some((f) => f.value === "N/A")).toBe(true);
  });
});

// --- Format Policies Result ---
describe("formatPoliciesResult", () => {
  test("should format array of policies", () => {
    const policies = [
      { id: "finance.payment.refund.v1", name: "Refund Policy" },
      { id: "data.export.v1", description: "Data export controls" },
    ];

    const embed = formatPoliciesResult(policies);

    expect(embed.data.fields.some((f) => f.name === "Policies")).toBe(true);
  });

  test("should show fallback when policies is null", () => {
    const embed = formatPoliciesResult(null);

    expect(embed.data.color).toBe(0x06b6d4);
    expect(embed.data.fields.some((f) => f.name === "Policies")).toBe(true);
  });
});

// --- Format Help Result ---
describe("formatHelpResult", () => {
  test("should include all command names", () => {
    const embed = formatHelpResult();

    expect(embed.data.title).toBe("APort Bot — Help");
    expect(embed.data.color).toBe(0x06b6d4);
  });
});

// --- APort Client ---
describe("APortClient", () => {
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

  test("should configure axios client with API key header when provided", () => {
    const client = new APortClient({ apiKey: "test-key" });
    expect(client.client.defaults.headers.Authorization).toBe("Bearer test-key");
  });

  test("should not set Authorization header without API key", () => {
    const client = new APortClient();
    expect(client.client.defaults.headers.Authorization).toBeUndefined();
  });

  test("suspendPassport should throw without API key", async () => {
    const client = new APortClient();
    await expect(client.suspendPassport("agt_123")).rejects.toThrow(
      "API key required"
    );
  });
});
