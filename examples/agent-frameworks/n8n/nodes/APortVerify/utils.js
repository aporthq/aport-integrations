function normalizeBaseUrl(baseUrl) {
  return (baseUrl || "https://aport.io").replace(/\/+$/, "");
}

function parseContextValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(\{|\[|"|-?\d|true$|false$|null$)/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch (_error) {
      return value;
    }
  }

  return value;
}

function buildContext({ mode, inputJson = {}, contextJson = "{}", fields = {} }) {
  if (mode === "input") {
    return { ...inputJson };
  }

  if (mode === "fields") {
    const entries = fields.field || [];
    return entries.reduce((context, field) => {
      if (field.key) {
        context[field.key] = parseContextValue(field.value);
      }
      return context;
    }, {});
  }

  if (contextJson && typeof contextJson === "object") {
    if (Array.isArray(contextJson)) {
      throw new Error("Context JSON must be an object.");
    }
    return contextJson;
  }

  if (!contextJson || !contextJson.trim()) {
    return {};
  }

  const parsed = JSON.parse(contextJson);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Context JSON must be an object.");
  }

  return parsed;
}

function getDecisionValue(response = {}) {
  return (
    response.decision ||
    response.verdict ||
    response.status ||
    response.result ||
    response.outcome ||
    ""
  );
}

function isApproved(response = {}) {
  if (
    response.approved === true ||
    response.allowed === true ||
    response.allow === true ||
    response.verified === true
  ) {
    return true;
  }

  const decision = String(getDecisionValue(response)).toLowerCase();
  return ["allow", "allowed", "approve", "approved", "pass", "passed"].includes(
    decision
  );
}

function formatError(error) {
  if (error && error.response && error.response.data) {
    return (
      error.response.data.message ||
      error.response.data.error ||
      JSON.stringify(error.response.data)
    );
  }

  return error && error.message ? error.message : String(error);
}

module.exports = {
  buildContext,
  formatError,
  isApproved,
  normalizeBaseUrl,
  parseContextValue,
};
