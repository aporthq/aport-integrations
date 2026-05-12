const { createPullRequestCheck } = require("./check-run");
const { buildPullRequestContext } = require("./pull-request-context");

const SUPPORTED_ACTIONS = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
  "edited",
]);

function createPullRequestVerifier(options) {
  const {
    aportClient,
    agentId,
    policyPack = "code.repository.merge.v1",
    allowedBaseBranches = [],
    failOnError = true,
    logger = console,
  } = options;

  if (!aportClient) {
    throw new Error("aportClient is required");
  }

  return {
    async handlePullRequest(payload, octokit) {
      if (!SUPPORTED_ACTIONS.has(payload.action)) {
        logger.info(`Ignoring pull_request.${payload.action}`);
        return { ignored: true };
      }

      const context = buildPullRequestContext(payload, {
        allowedBaseBranches,
      });

      try {
        const verification = await aportClient.verifyPolicy(
          policyPack,
          agentId,
          context
        );
        const checkResult = verification.verified
          ? successResult(policyPack, verification)
          : failureResult(policyPack, verification);

        await createPullRequestCheck(octokit, payload, checkResult);
        return { ignored: false, verification, checkResult };
      } catch (error) {
        logger.error("APort verification failed", error);
        const checkResult = errorResult(policyPack, error, failOnError);
        await createPullRequestCheck(octokit, payload, checkResult);
        return { ignored: false, error, checkResult };
      }
    },
  };
}

function successResult(policyPack, verification) {
  return {
    conclusion: "success",
    title: "APort policy approved this pull request",
    summary: `Policy pack \`${policyPack}\` returned an allow result.`,
    text: verification.message || "The configured APort policy check passed.",
  };
}

function failureResult(policyPack, verification) {
  return {
    conclusion: "failure",
    title: "APort policy denied this pull request",
    summary: `Policy pack \`${policyPack}\` returned a deny result.`,
    text:
      verification.message ||
      "The configured APort policy check denied this pull request.",
  };
}

function errorResult(policyPack, error, failOnError) {
  return {
    conclusion: failOnError ? "failure" : "neutral",
    title: "APort policy verification could not complete",
    summary: `Policy pack \`${policyPack}\` could not be evaluated.`,
    text: error.message,
  };
}

module.exports = { createPullRequestVerifier };
