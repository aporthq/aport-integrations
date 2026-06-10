function buildVerificationPayload({ userId, action, resource, reason, policyPack }) {
  if (!userId) {
    throw new Error("Discord user id is required");
  }

  if (!action) {
    throw new Error("Action is required");
  }

  return {
    policy_pack: policyPack,
    context: {
      actor: {
        type: "discord_user",
        id: userId,
      },
      action,
      resource,
      reason,
      requested_at: new Date().toISOString(),
    },
  };
}

function parseDecision(result) {
  return result?.data?.decision || result?.decision || result;
}

async function verifyAction(options) {
  const { apiKey, apiUrl = "https://aport.io/api/verify" } = options;
  const payload = buildVerificationPayload(options);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey || ""}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`APort verification failed with HTTP ${response.status}`);
  }

  const result = await response.json();
  return parseDecision(result);
}

function formatDecision(decision) {
  if (!decision) {
    return {
      allow: false,
      text: "APort did not return a decision.",
    };
  }

  const reasons = Array.isArray(decision.reasons)
    ? decision.reasons
        .map((reason) => reason.message || reason.code || String(reason))
        .filter(Boolean)
    : [];

  return {
    allow: Boolean(decision.allow),
    text: [
      `Allow: ${decision.allow ? "yes" : "no"}`,
      reasons.length > 0 ? `Reasons: ${reasons.join("; ")}` : null,
      decision.decision_id ? `Decision: ${decision.decision_id}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

module.exports = {
  buildVerificationPayload,
  formatDecision,
  parseDecision,
  verifyAction,
};
