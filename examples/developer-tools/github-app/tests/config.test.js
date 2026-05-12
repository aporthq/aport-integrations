const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildVerificationContext,
  labelsForPullRequest,
  mergeConfig,
  resolveAgentId,
} = require("../src/config");
const {
  conclusionForVerification,
  outputForVerification,
} = require("../src/checks");

const pullRequest = {
  number: 42,
  title: "Add feature",
  draft: false,
  user: { login: "octocat" },
  base: { ref: "main" },
  head: { ref: "feature/aport", sha: "abc123" },
  labels: [{ name: "security" }, { name: "needs-review" }],
};

test("mergeConfig keeps defaults and overrides nested values", () => {
  const config = mergeConfig({
    policy: "custom.policy.v1",
    agent: {
      source: "static",
      staticAgentId: "ap_static",
    },
  });

  assert.equal(config.policy, "custom.policy.v1");
  assert.equal(config.agent.source, "static");
  assert.equal(config.agent.staticAgentId, "ap_static");
  assert.equal(config.context.includeFiles, true);
});

test("resolveAgentId supports author, static, map, and branch sources", () => {
  assert.equal(resolveAgentId(mergeConfig(), pullRequest), "octocat");
  assert.equal(resolveAgentId(mergeConfig({ agent: { source: "static", staticAgentId: "ap_123" } }), pullRequest), "ap_123");
  assert.equal(
    resolveAgentId(mergeConfig({ agent: { source: "author-map", authorMap: { octocat: "ap_mapped" } } }), pullRequest),
    "ap_mapped"
  );
  assert.equal(resolveAgentId(mergeConfig({ agent: { source: "branch" } }), pullRequest), "feature/aport");
});

test("labelsForPullRequest returns label names", () => {
  assert.deepEqual(labelsForPullRequest(pullRequest), ["security", "needs-review"]);
});

test("buildVerificationContext includes PR metadata and changed files", async () => {
  const context = {
    payload: {
      repository: { full_name: "owner/repo" },
    },
    repo(params) {
      return { owner: "owner", repo: "repo", ...params };
    },
    octokit: {
      pulls: {
        async listFiles(params) {
          assert.equal(params.pull_number, 42);
          return {
            data: [
              {
                filename: "src/index.js",
                additions: 10,
                deletions: 2,
                changes: 12,
                status: "modified",
              },
            ],
          };
        },
      },
    },
  };

  const verificationContext = await buildVerificationContext(context, mergeConfig(), pullRequest);

  assert.equal(verificationContext.repository, "owner/repo");
  assert.deepEqual(verificationContext.pullRequest.labels, ["security", "needs-review"]);
  assert.deepEqual(verificationContext.pullRequest.files, [
    {
      filename: "src/index.js",
      additions: 10,
      deletions: 2,
      changes: 12,
      status: "modified",
    },
  ]);
});

test("check helpers produce expected conclusions and output", () => {
  assert.equal(conclusionForVerification({ allowed: true }, true), "success");
  assert.equal(conclusionForVerification({ allowed: false }, true), "failure");
  assert.equal(conclusionForVerification({ allowed: false }, false), "neutral");

  assert.match(
    outputForVerification({
      verification: { allowed: false, reason: "Denied" },
      agentId: "octocat",
      policy: "code.repository.merge.v1",
    }).summary,
    /Denied/
  );
});
