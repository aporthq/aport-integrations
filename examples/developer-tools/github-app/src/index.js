require("dotenv").config();

const { verifyAportPolicy } = require("./aport");
const {
  buildVerificationContext,
  mergeConfig,
  resolveAgentId,
} = require("./config");
const {
  conclusionForVerification,
  createCompletedCheckRun,
  outputForVerification,
} = require("./checks");

async function loadConfig(context) {
  const repoConfig = await context.config("aport.yml", {});
  return mergeConfig(repoConfig);
}

async function verifyPullRequest(context) {
  const pullRequest = context.payload.pull_request;
  const config = await loadConfig(context);

  if (!config.enabled) {
    context.log.info("APort GitHub App disabled by .github/aport.yml");
    return;
  }

  const agentId = resolveAgentId(config, pullRequest);
  const verificationContext = await buildVerificationContext(context, config, pullRequest);
  const verification = await verifyAportPolicy({
    agentId,
    policy: config.policy,
    context: verificationContext,
  });
  const conclusion = conclusionForVerification(verification, config.failOnError);
  const output = outputForVerification({
    verification,
    agentId,
    policy: config.policy,
  });

  await createCompletedCheckRun({
    context,
    pullRequest,
    checkName: config.checkName,
    conclusion,
    output,
  });
}

module.exports = (app) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.ready_for_review",
      "pull_request.synchronize",
    ],
    verifyPullRequest
  );
};

module.exports.loadConfig = loadConfig;
module.exports.verifyPullRequest = verifyPullRequest;
