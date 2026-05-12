const { CHECK_NAME } = require("../src/check-run");
const { createPullRequestVerifier } = require("../src/verifier");

function createPayload(overrides = {}) {
  return {
    action: "opened",
    repository: {
      id: 1,
      name: "demo",
      full_name: "aporthq/demo",
      private: false,
      default_branch: "main",
      owner: {
        login: "aporthq",
      },
    },
    pull_request: {
      number: 42,
      title: "Secure PR verification",
      body: "Adds a guarded merge flow",
      state: "open",
      draft: false,
      html_url: "https://github.com/aporthq/demo/pull/42",
      user: {
        login: "contributor",
      },
      base: {
        ref: "main",
        sha: "base-sha",
      },
      head: {
        ref: "feature",
        sha: "head-sha",
        repo: {
          full_name: "contributor/demo",
        },
      },
      changed_files: 3,
      additions: 10,
      deletions: 2,
      labels: [{ name: "security" }],
      requested_reviewers: [{ login: "reviewer" }],
    },
    sender: {
      login: "contributor",
      type: "User",
    },
    ...overrides,
  };
}

function createOctokit() {
  return {
    rest: {
      checks: {
        create: jest.fn().mockResolvedValue({ data: { id: 123 } }),
      },
    },
  };
}

describe("createPullRequestVerifier", () => {
  it("creates a passing check when APort allows the pull request", async () => {
    const aportClient = {
      verifyPolicy: jest.fn().mockResolvedValue({
        verified: true,
        message: "policy passed",
      }),
    };
    const octokit = createOctokit();
    const verifier = createPullRequestVerifier({
      aportClient,
      agentId: "agt_test",
      policyPack: "code.repository.merge.v1",
      allowedBaseBranches: ["main"],
      logger: silentLogger(),
    });

    await verifier.handlePullRequest(createPayload(), octokit);

    expect(aportClient.verifyPolicy).toHaveBeenCalledWith(
      "code.repository.merge.v1",
      "agt_test",
      expect.objectContaining({
        repository: expect.objectContaining({ full_name: "aporthq/demo" }),
        pull_request: expect.objectContaining({
          number: 42,
          head: expect.objectContaining({ sha: "head-sha" }),
        }),
      })
    );
    expect(octokit.rest.checks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "aporthq",
        repo: "demo",
        name: CHECK_NAME,
        head_sha: "head-sha",
        conclusion: "success",
      })
    );
  });

  it("creates a failing check when APort denies the pull request", async () => {
    const aportClient = {
      verifyPolicy: jest.fn().mockResolvedValue({
        verified: false,
        message: "branch policy failed",
      }),
    };
    const octokit = createOctokit();
    const verifier = createPullRequestVerifier({
      aportClient,
      agentId: "agt_test",
      policyPack: "code.repository.merge.v1",
      logger: silentLogger(),
    });

    await verifier.handlePullRequest(createPayload(), octokit);

    expect(octokit.rest.checks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: "failure",
        output: expect.objectContaining({
          text: "branch policy failed",
        }),
      })
    );
  });

  it("turns verification errors into neutral checks when failOnError is false", async () => {
    const aportClient = {
      verifyPolicy: jest.fn().mockRejectedValue(new Error("timeout")),
    };
    const octokit = createOctokit();
    const verifier = createPullRequestVerifier({
      aportClient,
      agentId: "agt_test",
      policyPack: "code.repository.merge.v1",
      failOnError: false,
      logger: silentLogger(),
    });

    await verifier.handlePullRequest(createPayload(), octokit);

    expect(octokit.rest.checks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: "neutral",
        output: expect.objectContaining({
          text: "timeout",
        }),
      })
    );
  });

  it("ignores unsupported pull request actions", async () => {
    const aportClient = {
      verifyPolicy: jest.fn(),
    };
    const octokit = createOctokit();
    const verifier = createPullRequestVerifier({
      aportClient,
      agentId: "agt_test",
      logger: silentLogger(),
    });

    const result = await verifier.handlePullRequest(
      createPayload({ action: "closed" }),
      octokit
    );

    expect(result.ignored).toBe(true);
    expect(aportClient.verifyPolicy).not.toHaveBeenCalled();
    expect(octokit.rest.checks.create).not.toHaveBeenCalled();
  });
});

function silentLogger() {
  return {
    error: jest.fn(),
    info: jest.fn(),
  };
}
