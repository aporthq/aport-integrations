require("dotenv").config();

const http = require("http");
const crypto = require("crypto");

const APortClient = require("./client");
const GitHubHelper = require("./github");

// --- Logger ---
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel =
  LOG_LEVELS[process.env.LOG_LEVEL] !== undefined
    ? LOG_LEVELS[process.env.LOG_LEVEL]
    : LOG_LEVELS.info;

function log(level, ...args) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, ...args);
    } else if (level === "warn") {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}

// --- Environment Validation ---
function validateEnv() {
  const required = [];
  const warnings = [];

  if (!process.env.GITHUB_APP_ID) {
    required.push("GITHUB_APP_ID");
  }
  if (!process.env.GITHUB_PRIVATE_KEY) {
    required.push("GITHUB_PRIVATE_KEY");
  }
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    warnings.push(
      "GITHUB_WEBHOOK_SECRET not set — webhook signature verification is disabled"
    );
  }
  if (!process.env.APORT_API_KEY) {
    warnings.push(
      "APORT_API_KEY not set — some APort endpoints may be unavailable"
    );
  }

  if (required.length > 0) {
    log("error", `Missing required environment variables: ${required.join(", ")}`);
    log("error", "Please copy .env.example to .env and fill in your credentials.");
    return false;
  }

  warnings.forEach((w) => log("warn", w));

  log("info", "Environment validated successfully.");
  log("info", `APort Base URL: ${process.env.APORT_BASE_URL || "https://aport.io"}`);
  log(
    "info",
    `Default Policy Pack: ${process.env.DEFAULT_POLICY_PACK || "code.repository.merge.v1"}`
  );
  return true;
}

// --- PR Event Handler ---
/**
 * Handle a pull_request webhook event.
 * Verifies the PR against the configured APort policy pack
 * and creates a commit status on the PR.
 */
async function handlePullRequest(payload, bodyString) {
  const action = payload.action;
  const pr = payload.pull_request;

  if (!pr) {
    log("warn", "Pull request event without pull_request object");
    return { statusCode: 400, message: "Missing pull_request data" };
  }

  // Only process opened and synchronize events
  if (action !== "opened" && action !== "synchronize") {
    log("info", `Ignoring pull_request event: ${action}`);
    return { statusCode: 200, message: `Event ${action} ignored` };
  }

  log("info", `Processing PR #${pr.number} (${action}) in ${payload.repository?.full_name}`);

  const installationId = payload.installation?.id;
  if (!installationId) {
    log("error", "No installation ID found in webhook payload");
    return { statusCode: 400, message: "Missing installation ID" };
  }

  const repo = payload.repository;
  const sha = pr.head?.sha;
  const owner = repo?.owner?.login;
  const repoName = repo?.name;

  if (!sha || !owner || !repoName) {
    log("error", "Missing required repository data from webhook payload");
    return { statusCode: 400, message: "Missing repository data" };
  }

  const github = new GitHubHelper();
  const aportClient = new APortClient();
  const policyPack =
    process.env.DEFAULT_POLICY_PACK || "code.repository.merge.v1";
  const agentId = pr.user?.login || payload.sender?.login;

  // 1. Set status to "pending"
  let token;
  try {
    token = await github.getInstallationToken(installationId);
  } catch (error) {
    log("error", `Failed to get installation token: ${error.message}`);
    return { statusCode: 500, message: "Failed to authenticate with GitHub" };
  }

  try {
    await github.createCommitStatus({
      token,
      owner,
      repo: repoName,
      sha,
      state: "pending",
      description: "APort verification in progress...",
      context: "APort/PR-Verify",
    });
    log("info", `Set pending status on ${sha.substring(0, 7)}`);
  } catch (error) {
    log("error", `Failed to set pending status: ${error.message}`);
    // Continue — we'll still try verification
  }

  // 2. Call APort API for verification
  let verifyResult;
  try {
    const context = github.buildVerifyContext(payload);
    log("debug", `Verifying agent "${agentId}" against policy "${policyPack}"`);

    verifyResult = await aportClient.verify(policyPack, agentId, context);
    log("debug", `Verification result: ${JSON.stringify(verifyResult)}`);
  } catch (error) {
    log("error", `APort verification failed: ${error.message}`);

    // Report error status
    try {
      await github.createCommitStatus({
        token,
        owner,
        repo: repoName,
        sha,
        state: "error",
        description: `APort API error: ${error.message}`.substring(0, 140),
        context: "APort/PR-Verify",
      });
    } catch (statusError) {
      log("error", `Failed to set error status: ${statusError.message}`);
    }

    return { statusCode: 502, message: "APort verification error" };
  }

  // 3. Determine success/failure and create final commit status
  const decision = verifyResult.data?.decision || verifyResult.decision;
  const isApproved = decision && decision.allow;

  try {
    const statusParams = {
      token,
      owner,
      repo: repoName,
      sha,
      context: "APort/PR-Verify",
    };

    if (isApproved) {
      statusParams.state = "success";
      statusParams.description = `Approved by APort (policy: ${policyPack})`;
    } else {
      statusParams.state = "failure";
      const reasons = decision?.reasons || [];
      const reasonText =
        reasons.length > 0
          ? reasons.map((r) => r.message).join("; ")
          : `APort policy "${policyPack}" verification failed`;
      statusParams.description = reasonText.substring(0, 140);
    }

    await github.createCommitStatus(statusParams);
    log(
      "info",
      `Set ${statusParams.state} status for PR #${pr.number} on ${sha.substring(0, 7)}`
    );
  } catch (error) {
    log("error", `Failed to set final status: ${error.message}`);
    return { statusCode: 500, message: "Failed to update commit status" };
  }

  return {
    statusCode: 200,
    message: `PR #${pr.number} verified: ${isApproved ? "approved" : "denied"}`,
  };
}

// --- Webhook Server ---
function createServer() {
  const github = new GitHubHelper();

  return http.createServer(async (req, res) => {
    // Health check endpoint
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", app: "aport-github-app" }));
      return;
    }

    // Only accept POST for webhooks
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    // Collect the raw body
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      const bodyString = Buffer.concat(chunks).toString("utf8");

      // Verify webhook signature
      const signature = req.headers["x-hub-signature-256"];
      if (!github.verifySignature(bodyString, signature)) {
        log("warn", "Invalid webhook signature");
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }

      // Parse payload
      let payload;
      try {
        payload = JSON.parse(bodyString);
      } catch (error) {
        log("error", `Failed to parse webhook payload: ${error.message}`);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
        return;
      }

      const event = req.headers["x-github-event"];
      log("info", `Received webhook event: ${event}`);

      let result;
      try {
        if (event === "pull_request") {
          result = await handlePullRequest(payload, bodyString);
        } else {
          log("info", `Ignoring unhandled event: ${event}`);
          result = { statusCode: 200, message: `Event ${event} ignored` };
        }
      } catch (error) {
        log("error", `Unhandled error processing webhook: ${error.message}`);
        result = { statusCode: 500, message: "Internal server error" };
      }

      res.writeHead(result.statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: result.message }));
    });
  });
}

// --- Main ---
function main() {
  if (!validateEnv()) {
    process.exit(1);
  }

  const port = parseInt(process.env.PORT, 10) || 3000;
  const server = createServer();

  server.listen(port, () => {
    log("info", `APort GitHub App listening on port ${port}`);
    log("info", `Health check: http://localhost:${port}/health`);
    log("info", "Waiting for webhook events...");
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    log("info", `Received ${signal}, shutting down...`);
    server.close(() => {
      log("info", "Server closed.");
      process.exit(0);
    });
    setTimeout(() => {
      log("error", "Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (error) => {
    log("error", `Uncaught exception: ${error.message}`);
    log("error", error.stack);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    log("error", `Unhandled rejection: ${reason}`);
  });

  return server;
}

// Export for testing
module.exports = { createServer, handlePullRequest, validateEnv };

// Start if run directly
if (require.main === module) {
  main();
}
