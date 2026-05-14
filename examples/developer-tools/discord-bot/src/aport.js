const DEFAULT_BASE_URL = "https://aport.io";

function formatReasons(reasons) {
  if (!Array.isArray(reasons)) {
    return undefined;
  }

  return reasons
    .map((reason) => {
      if (!reason) {
        return undefined;
      }

      if (typeof reason === "string") {
        return reason;
      }

      return reason.message || reason.code;
    })
    .filter(Boolean)
    .join(", ");
}

function normalizeDecision(result) {
  const decision = result && (result.decision || (result.data && result.data.decision));

  if (decision && Object.prototype.hasOwnProperty.call(decision, "allow")) {
    return {
      allowed: Boolean(decision.allow),
      reason: formatReasons(decision.reasons) || decision.reason,
      raw: result,
    };
  }

  return {
    allowed: Boolean(result && (result.verified || result.allowed || result.allow)),
    reason: result && (result.reason || result.message),
    raw: result,
  };
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

async function verifyPolicy({
  agentId,
  policy,
  context = {},
  apiKey = process.env.APORT_API_KEY,
  baseUrl = process.env.APORT_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
}) {
  if (!agentId) {
    return {
      allowed: false,
      reason: "Agent ID is required.",
      raw: null,
    };
  }

  if (!fetchImpl) {
    throw new Error("A fetch implementation is required. Use Node.js 18 or newer.");
  }

  const headers = { "Content-Type": "application/json" };

  if (apiKey) {
    headers.Authorization = "Bearer " + apiKey;
  }

  const response = await fetchImpl(
    baseUrl.replace(/\/$/, "") + "/api/verify/policy/" + encodeURIComponent(policy),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        context: {
          agent_id: agentId,
          policy_id: policy,
          context,
        },
      }),
    }
  );

  const body = await parseResponse(response);

  if (!response.ok) {
    return {
      allowed: false,
      reason: body.message || "APort request failed with status " + response.status,
      raw: body,
    };
  }

  return normalizeDecision(body);
}

module.exports = {
  formatReasons,
  normalizeDecision,
  verifyPolicy,
};
