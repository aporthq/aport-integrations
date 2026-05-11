const { version: platformVersion } = require("zapier-platform-core");
const { version } = require("./package.json");
const verifyPassport = require("./creates/verify_passport");

const DEFAULT_BASE_URL = "https://api.aport.io";

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function includeAuthHeaders(request, z, bundle) {
  const apiKey = bundle.authData.apiKey;

  if (!apiKey) {
    return request;
  }

  return {
    ...request,
    headers: {
      ...request.headers,
      Authorization: `Bearer ${apiKey}`,
    },
  };
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

function summarizeReasons(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return "";
  }

  return reasons
    .map((reason) => reason.message || reason.code || String(reason))
    .join("; ");
}

function throwForAuthErrors(response, z) {
  if (response.status !== 401 && response.status !== 403) {
    return response;
  }

  const data = readResponseData(response);
  const details = summarizeReasons(data.reasons);
  const message = details || data.message || "APort authentication failed";

  throw new z.errors.ExpiredAuthError(message);
}

async function testAuthentication(z, bundle) {
  const response = await z.request({
    method: "GET",
    url: `${normalizeBaseUrl(bundle.authData.baseUrl)}/api/policies`,
    headers: {
      Accept: "application/json",
    },
  });

  const data = readResponseData(response);
  const policies = Array.isArray(data) ? data : data.policies || [];

  return {
    ok: true,
    policy_count: policies.length,
    base_url: normalizeBaseUrl(bundle.authData.baseUrl),
  };
}

module.exports = {
  version,
  platformVersion,

  authentication: {
    type: "custom",
    fields: [
      {
        key: "apiKey",
        type: "password",
        required: false,
        label: "APort API Key",
        helpText:
          "Optional bearer token for APort API calls. Some verification deployments allow public policy checks.",
      },
      {
        key: "baseUrl",
        type: "string",
        required: false,
        label: "APort API Base URL",
        default: DEFAULT_BASE_URL,
        helpText:
          "Override for sandbox or self-hosted APort deployments. Defaults to https://api.aport.io.",
      },
    ],
    test: testAuthentication,
    connectionLabel: (z, bundle) =>
      `APort (${normalizeBaseUrl(bundle.authData.baseUrl)})`,
  },

  beforeRequest: [includeAuthHeaders],
  afterResponse: [throwForAuthErrors],

  creates: {
    [verifyPassport.key]: verifyPassport,
  },
};
