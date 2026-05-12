function readConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    github: {
      appId: env.GITHUB_APP_ID,
      webhookSecret: env.GITHUB_WEBHOOK_SECRET,
      privateKey: normalizePrivateKey(env.GITHUB_PRIVATE_KEY),
    },
    aport: {
      apiKey: env.APORT_API_KEY,
      baseUrl: env.APORT_BASE_URL || "https://aport.io",
      agentId: env.APORT_AGENT_ID,
      policyPack: env.APORT_POLICY_PACK || "code.repository.merge.v1",
      allowedBaseBranches: splitList(env.APORT_ALLOWED_BASE_BRANCHES),
      failOnError: env.APORT_FAIL_ON_ERROR !== "false",
    },
  };
}

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : undefined;
}

function splitList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function assertServerConfig(config) {
  const missing = [];

  if (!config.github.appId) {
    missing.push("GITHUB_APP_ID");
  }
  if (!config.github.webhookSecret) {
    missing.push("GITHUB_WEBHOOK_SECRET");
  }
  if (!config.github.privateKey) {
    missing.push("GITHUB_PRIVATE_KEY");
  }
  if (!config.aport.apiKey) {
    missing.push("APORT_API_KEY");
  }
  if (!config.aport.agentId) {
    missing.push("APORT_AGENT_ID");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

module.exports = { assertServerConfig, readConfig };
