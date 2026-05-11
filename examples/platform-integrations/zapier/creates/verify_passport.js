const DEFAULT_BASE_URL = "https://api.aport.io";

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function parseContext(value, z) {
  if (value === undefined || value === null || value === "") {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    throw new z.errors.Error("Context must be a JSON object.");
  }

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new z.errors.Error(`Context must be valid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new z.errors.Error("Context must be a JSON object.");
  }

  return parsed;
}

function readResponseData(response) {
  if (response.data !== undefined) {
    return response.data;
  }

  const content = response.content || response.body;
  if (!content) {
    return {};
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

function normalizeReasons(reasons) {
  if (!Array.isArray(reasons)) {
    return [];
  }

  return reasons.map((reason) => ({
    code: reason.code || "",
    message: reason.message || String(reason),
    severity: reason.severity || "",
  }));
}

function extractDecision(payload) {
  return payload.data?.decision || payload.decision || payload;
}

function summarizeReasons(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return "";
  }

  return reasons
    .map((reason) => reason.message || reason.code || String(reason))
    .join("; ");
}

function buildErrorMessage(response, payload) {
  const decision = extractDecision(payload);
  const details =
    summarizeReasons(decision.reasons) || summarizeReasons(payload.reasons);

  return (
    details ||
    payload.message ||
    payload.error ||
    `APort API returned HTTP ${response.status}`
  );
}

function isEnabled(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

async function perform(z, bundle) {
  const agentId = bundle.inputData.agentId;
  const policyId = bundle.inputData.policyId;
  const context = parseContext(bundle.inputData.context, z);
  const idempotencyKey = bundle.inputData.idempotencyKey;
  const baseUrl = normalizeBaseUrl(bundle.authData.baseUrl);

  const body = {
    agent_id: agentId,
    context,
  };

  if (idempotencyKey) {
    body.idempotency_key = idempotencyKey;
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await z.request({
    method: "POST",
    url: `${baseUrl}/api/verify/policy/${encodeURIComponent(policyId)}`,
    headers,
    body: JSON.stringify(body),
  });

  const payload = readResponseData(response);

  if (response.status >= 400) {
    throw new z.errors.Error(buildErrorMessage(response, payload));
  }

  const decision = extractDecision(payload);
  const reasons = normalizeReasons(decision.reasons || payload.reasons);
  const allow = Boolean(
    decision.allow ?? decision.verified ?? payload.allow ?? payload.verified
  );

  if (isEnabled(bundle.inputData.failOnDeny) && !allow) {
    throw new z.errors.HaltedError(
      summarizeReasons(reasons) || "APort policy verification denied."
    );
  }

  return {
    id: decision.decision_id || `${agentId}:${policyId}`,
    allow,
    status: allow ? "allowed" : "denied",
    agent_id: agentId,
    policy_id: policyId,
    decision_id: decision.decision_id || "",
    assurance_level: decision.assurance_level || "",
    expires_in: decision.expires_in || null,
    reasons,
    raw_response: payload,
  };
}

module.exports = {
  key: "aport_verify",
  noun: "APort Verification",
  display: {
    label: "APort Verify",
    description:
      "Verify an APort Passport ID against a policy and return a routeable allow or deny decision.",
  },
  operation: {
    cleanInputData: false,
    perform,
    inputFields: [
      {
        key: "agentId",
        label: "Passport ID",
        type: "string",
        required: true,
        helpText: "The APort Passport or agent identifier to verify.",
      },
      {
        key: "policyId",
        label: "Policy ID",
        type: "string",
        required: true,
        default: "finance.payment.refund.v1",
        helpText:
          "Policy pack identifier, for example finance.payment.refund.v1 or code.repository.merge.v1.",
      },
      {
        key: "context",
        label: "Context JSON",
        type: "text",
        required: false,
        default: "{}",
        helpText:
          "JSON object with policy-specific context. Use minor currency units for money, for example 500 for $5.00.",
      },
      {
        key: "idempotencyKey",
        label: "Idempotency Key",
        type: "string",
        required: false,
        helpText:
          "Optional unique key forwarded to APort for repeat-safe verification requests.",
      },
      {
        key: "failOnDeny",
        label: "Stop Zap on Deny",
        type: "boolean",
        required: false,
        default: "false",
        helpText:
          "When enabled, a denied decision halts this Zap step. Leave disabled to route using the allow or status output.",
      },
    ],
    outputFields: [
      { key: "allow", label: "Allowed", type: "boolean" },
      { key: "status", label: "Status", type: "string" },
      { key: "agent_id", label: "Passport ID", type: "string" },
      { key: "policy_id", label: "Policy ID", type: "string" },
      { key: "decision_id", label: "Decision ID", type: "string" },
      { key: "assurance_level", label: "Assurance Level", type: "string" },
      { key: "expires_in", label: "Expires In Seconds", type: "integer" },
      { key: "reasons", label: "Reasons", list: true },
    ],
    sample: {
      id: "dec_sample_123",
      allow: true,
      status: "allowed",
      agent_id: "ap_sample_agent",
      policy_id: "finance.payment.refund.v1",
      decision_id: "dec_sample_123",
      assurance_level: "verified",
      expires_in: 300,
      reasons: [],
    },
  },
};
