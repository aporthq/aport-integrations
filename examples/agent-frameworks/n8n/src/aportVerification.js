const { APortClient } = require("@aporthq/sdk-node");

function createAPortClient(credentials = {}) {
  const options = {};

  if (credentials.baseUrl) {
    options.baseUrl = credentials.baseUrl;
  }

  if (credentials.apiKey) {
    options.apiKey = credentials.apiKey;
  }

  if (credentials.timeoutMs) {
    options.timeoutMs = Number(credentials.timeoutMs);
  }

  return new APortClient(options);
}

function parseContextJson(contextJson) {
  if (contextJson === undefined || contextJson === null || contextJson === "") {
    return {};
  }

  if (typeof contextJson === "object") {
    return contextJson;
  }

  try {
    return JSON.parse(contextJson);
  } catch (error) {
    throw new Error(`Context must be valid JSON: ${error.message}`);
  }
}

function isAllowedDecision(response = {}) {
  if (typeof response.allow === "boolean") {
    return response.allow;
  }

  if (typeof response.allowed === "boolean") {
    return response.allowed;
  }

  if (typeof response.verified === "boolean") {
    return response.verified;
  }

  if (typeof response.success === "boolean") {
    return response.success;
  }

  const decision = response.decision || response.status || response.result;

  if (typeof decision === "string") {
    return ["allow", "allowed", "approved", "pass", "passed", "verified"].includes(
      decision.toLowerCase()
    );
  }

  return false;
}

function buildOutputPayload({
  inputJson = {},
  includeInputData = true,
  passportId,
  policyId,
  response,
}) {
  const aport = {
    passportId,
    policyId,
    allowed: isAllowedDecision(response),
    decisionId: response.decision_id || response.decisionId || null,
    assuranceLevel: response.assurance_level || response.assuranceLevel || null,
    reasons: response.reasons || [],
    rawResponse: response,
  };

  if (!includeInputData) {
    return aport;
  }

  return {
    ...inputJson,
    aport,
  };
}

async function verifyPassport({
  client,
  passportId,
  policyId,
  context = {},
  idempotencyKey,
}) {
  if (!client || typeof client.verifyPolicy !== "function") {
    throw new Error("APort client must expose a verifyPolicy method.");
  }

  if (!passportId || typeof passportId !== "string") {
    throw new Error("Passport ID is required.");
  }

  if (!policyId || typeof policyId !== "string") {
    throw new Error("Policy ID is required.");
  }

  return client.verifyPolicy(passportId, policyId, context, idempotencyKey || undefined);
}

module.exports = {
  buildOutputPayload,
  createAPortClient,
  isAllowedDecision,
  parseContextJson,
  verifyPassport,
};
