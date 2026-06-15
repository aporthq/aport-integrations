/**
 * Basic Usage Example — APort GitHub App
 *
 * This example shows how to use the APort Client and GitHub Helper
 * programmatically, without running the full webhook server.
 *
 * Usage: node examples/basic-usage.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const APortClient = require("../src/client");
const GitHubHelper = require("../src/github");

async function main() {
  console.log("=== APort GitHub App — Basic Usage Example ===\n");

  // 1. Initialize APort Client
  const aportClient = new APortClient();

  console.log("1. APortClient initialized");
  console.log(`   Base URL: ${aportClient.baseUrl}`);
  console.log(`   API Key: ${aportClient.apiKey ? "configured" : "not configured"}\n`);

  // 2. Verify an agent against a policy (requires API connection)
  console.log("2. Verifying agent...");
  try {
    const result = await aportClient.verify(
      "code.repository.merge.v1",
      "test-agent",
      {
        repository: "test-org/test-repo",
        pr_number: 1,
        base_branch: "main",
        head_branch: "feature/add-login",
        user: "contributor",
      }
    );

    const decision = result.data?.decision || result.decision;
    console.log(`   Result: ${decision?.allow ? "APPROVED" : "DENIED"}`);
    if (decision?.reasons) {
      decision.reasons.forEach((r) => console.log(`   - ${r.message}`));
    }
  } catch (error) {
    console.log(`   Cannot verify (API may be unavailable): ${error.message}`);
  }
  console.log();

  // 3. List available policy packs
  console.log("3. Listing policy packs...");
  try {
    const policies = await aportClient.listPolicies();
    if (Array.isArray(policies)) {
      policies.forEach((p) => {
        console.log(`   - ${p.id || p.policy_id}: ${p.name || p.description || "N/A"}`);
      });
    }
  } catch (error) {
    console.log(`   Cannot list policies (API may be unavailable): ${error.message}`);
  }
  console.log();

  // 4. Demonstrate GitHub Helper (signature verification)
  console.log("4. GitHub Helper — Signature Verification");
  const github = new GitHubHelper({
    webhookSecret: "my-secret",
    appId: "12345",
  });

  const crypto = require("crypto");
  const payload = '{"action":"opened","pull_request":{"number":1}}';
  const signature =
    "sha256=" +
    crypto.createHmac("sha256", "my-secret").update(payload, "utf8").digest("hex");

  const isValid = github.verifySignature(payload, signature);
  console.log(`   Signature valid: ${isValid}\n`);

  // 5. Demonstrate building verification context
  console.log("5. Building verification context...");
  const context = github.buildVerifyContext({
    action: "synchronize",
    pull_request: {
      number: 42,
      title: "Fix: resolve login bug",
      base: { ref: "main" },
      head: { ref: "fix/login-bug", sha: "def456" },
      user: { login: "dev-user" },
      changed_files: 2,
      additions: 15,
      deletions: 3,
      merged: false,
      draft: false,
    },
    repository: { full_name: "acme/webapp" },
    sender: { login: "dev-user" },
  });

  console.log("   Context for APort verification:");
  Object.entries(context).forEach(([key, value]) => {
    console.log(`     ${key}: ${JSON.stringify(value)}`);
  });

  console.log("\n=== Example complete ===");
}

main().catch(console.error);
