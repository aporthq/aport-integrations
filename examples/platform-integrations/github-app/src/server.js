require("dotenv").config();

const express = require("express");
const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");
const { Webhooks } = require("@octokit/webhooks");
const { APortClient } = require("./aport-client");
const { assertServerConfig, readConfig } = require("./config");
const { createPullRequestVerifier } = require("./verifier");

const config = readConfig();
assertServerConfig(config);

const auth = createAppAuth({
  appId: config.github.appId,
  privateKey: config.github.privateKey,
});

const webhooks = new Webhooks({
  secret: config.github.webhookSecret,
});

const verifier = createPullRequestVerifier({
  aportClient: new APortClient(config.aport),
  agentId: config.aport.agentId,
  policyPack: config.aport.policyPack,
  allowedBaseBranches: config.aport.allowedBaseBranches,
  failOnError: config.aport.failOnError,
});

webhooks.on("pull_request", async ({ payload }) => {
  const installationId = payload.installation && payload.installation.id;

  if (!installationId) {
    throw new Error("GitHub App installation ID missing from webhook payload");
  }

  const installationAuth = await auth({
    type: "installation",
    installationId,
  });
  const octokit = new Octokit({ auth: installationAuth.token });

  await verifier.handlePullRequest(payload, octokit);
});

webhooks.onError((error) => {
  console.error("GitHub webhook processing failed", error);
});

const app = express();

app.get("/healthz", (req, res) => {
  res.json({ ok: true });
});

app.post(
  "/webhooks/github",
  express.text({ type: "*/*" }),
  async (req, res, next) => {
    try {
      await webhooks.verifyAndReceive({
        id: req.header("x-github-delivery"),
        name: req.header("x-github-event"),
        signature: req.header("x-hub-signature-256"),
        payload: req.body,
      });
      res.status(202).json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "webhook_processing_failed",
    message: error.message,
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`APort GitHub App listening on port ${config.port}`);
  });
}

module.exports = { app, webhooks };
