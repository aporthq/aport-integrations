const zapier = require("zapier-platform-core");
const nock = require("nock");
const App = require("../index");

const appTester = zapier.createAppTester(App);

describe("APort Zapier app", () => {
  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  it("tests authentication by requesting policy metadata", async () => {
    nock("https://api.aport.io", {
      reqheaders: {
        authorization: "Bearer test-key",
      },
    })
      .get("/api/policies")
      .reply(200, [{ id: "finance.payment.refund.v1" }]);

    const result = await appTester(App.authentication.test, {
      authData: {
        apiKey: "test-key",
      },
    });

    expect(result).toEqual({
      ok: true,
      policy_count: 1,
      base_url: "https://api.aport.io",
    });
    expect(nock.isDone()).toBe(true);
  });

  it("returns a routeable allow decision for a successful verification", async () => {
    nock("https://api.aport.io", {
      reqheaders: {
        authorization: "Bearer test-key",
        "idempotency-key": "zap-run-123",
      },
    })
      .post("/api/verify/policy/finance.payment.refund.v1", {
        agent_id: "ap_test_agent",
        context: {
          amount: 500,
          currency: "USD",
        },
        idempotency_key: "zap-run-123",
      })
      .reply(200, {
        allow: true,
        decision_id: "dec_123",
        assurance_level: "verified",
        expires_in: 300,
        reasons: [],
      });

    const result = await appTester(App.creates.aport_verify.operation.perform, {
      authData: {
        apiKey: "test-key",
      },
      inputData: {
        agentId: "ap_test_agent",
        policyId: "finance.payment.refund.v1",
        context: '{"amount":500,"currency":"USD"}',
        idempotencyKey: "zap-run-123",
      },
    });

    expect(result).toMatchObject({
      id: "dec_123",
      allow: true,
      status: "allowed",
      agent_id: "ap_test_agent",
      policy_id: "finance.payment.refund.v1",
      decision_id: "dec_123",
      assurance_level: "verified",
      expires_in: 300,
      reasons: [],
    });
    expect(nock.isDone()).toBe(true);
  });

  it("returns a denied decision without throwing by default", async () => {
    nock("https://api.aport.io")
      .post("/api/verify/policy/data.export.v1")
      .reply(200, {
        allow: false,
        decision_id: "dec_denied",
        reasons: [
          {
            code: "LIMIT_EXCEEDED",
            message: "Requested export exceeds the passport row limit.",
            severity: "error",
          },
        ],
      });

    const result = await appTester(App.creates.aport_verify.operation.perform, {
      authData: {},
      inputData: {
        agentId: "ap_limited_agent",
        policyId: "data.export.v1",
        context: {
          rows: 100000,
        },
      },
    });

    expect(result.allow).toBe(false);
    expect(result.status).toBe("denied");
    expect(result.reasons).toEqual([
      {
        code: "LIMIT_EXCEEDED",
        message: "Requested export exceeds the passport row limit.",
        severity: "error",
      },
    ]);
    expect(nock.isDone()).toBe(true);
  });

  it("does not halt when failOnDeny is the Zapier string false value", async () => {
    nock("https://api.aport.io")
      .post("/api/verify/policy/data.export.v1")
      .reply(200, {
        allow: false,
        decision_id: "dec_denied_string_flag",
        reasons: [{ message: "Not allowed for this passport." }],
      });

    const result = await appTester(App.creates.aport_verify.operation.perform, {
      authData: {},
      inputData: {
        agentId: "ap_limited_agent",
        policyId: "data.export.v1",
        context: "{}",
        failOnDeny: "false",
      },
    });

    expect(result.allow).toBe(false);
    expect(result.status).toBe("denied");
    expect(nock.isDone()).toBe(true);
  });

  it("halts the Zap when failOnDeny is enabled", async () => {
    nock("https://api.aport.io")
      .post("/api/verify/policy/code.repository.merge.v1")
      .reply(200, {
        allow: false,
        reasons: [{ message: "Repository operation is not permitted." }],
      });

    await expect(
      appTester(App.creates.aport_verify.operation.perform, {
        authData: {},
        inputData: {
          agentId: "ap_repo_agent",
          policyId: "code.repository.merge.v1",
          context: "{}",
          failOnDeny: true,
        },
      })
    ).rejects.toThrow("Repository operation is not permitted.");
    expect(nock.isDone()).toBe(true);
  });

  it("rejects invalid context JSON before calling APort", async () => {
    await expect(
      appTester(App.creates.aport_verify.operation.perform, {
        authData: {},
        inputData: {
          agentId: "ap_test_agent",
          policyId: "finance.payment.refund.v1",
          context: "{not-json}",
        },
      })
    ).rejects.toThrow("Context must be valid JSON");
    expect(nock.pendingMocks()).toEqual([]);
  });

  it("surfaces APort API errors with reason details", async () => {
    nock("https://api.aport.io")
      .post("/api/verify/policy/finance.payment.refund.v1")
      .reply(400, {
        reasons: [
          {
            code: "INVALID_CONTEXT",
            message: "amount is required",
          },
        ],
      });

    await expect(
      appTester(App.creates.aport_verify.operation.perform, {
        authData: {},
        inputData: {
          agentId: "ap_test_agent",
          policyId: "finance.payment.refund.v1",
          context: "{}",
        },
      })
    ).rejects.toThrow("amount is required");
    expect(nock.isDone()).toBe(true);
  });
});
