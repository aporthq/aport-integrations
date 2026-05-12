"use strict";

const DEFAULT_BASE_URL = "https://aport.io";
const DEFAULT_POLICY_ID = "code.repository.merge.v1";

function normalizeBaseUrl(baseUrl) {
  const value = String(baseUrl || DEFAULT_BASE_URL).trim();
  return value.replace(/\/+$/, "");
}

function parseJsonObject(rawValue, fieldName) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return {};
  }

  if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
    return rawValue;
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error(`${fieldName} must be a JSON object`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${error.message}`);
  }
}

function parseKeyValueContext(pairs = {}) {
  const values = pairs.values || [];
  return values.reduce((context, pair) => {
    if (!pair.key) {
      return context;
    }

    context[pair.key] = coerceValue(pair.value);
    return context;
  }, {});
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

function buildContext(nodeContext, itemIndex, item) {
  const contextMode = nodeContext.getNodeParameter("contextMode", itemIndex);
  const itemContext = nodeContext.getNodeParameter("includeInputJson", itemIndex)
    ? item.json
    : {};

  if (contextMode === "keyValue") {
    return {
      ...itemContext,
      ...parseKeyValueContext(nodeContext.getNodeParameter("contextPairs", itemIndex)),
    };
  }

  return {
    ...itemContext,
    ...parseJsonObject(nodeContext.getNodeParameter("contextJson", itemIndex), "Context JSON"),
  };
}

function buildVerifyPayload(agentId, policyId, context) {
  return {
    context: {
      agent_id: agentId,
      policy_id: policyId,
      context,
    },
  };
}

function isVerified(response) {
  return Boolean(
    response &&
      (response.verified === true ||
        response.allowed === true ||
        response.authorized === true ||
        response.decision === "allow")
  );
}

function toOutputItem(inputItem, response, options = {}) {
  const verified = isVerified(response);
  const route = verified ? "verified" : "denied";

  const aport = options.includeRawResponse
    ? response
    : {
        verified,
        route,
        passport: response && response.passport,
        policy: response && (response.policy || response.policy_id),
        message: response && (response.message || response.reason),
      };

  return {
    json: {
      ...inputItem.json,
      aport_verified: verified,
      aport_route: route,
      aport,
    },
    pairedItem: {
      item: options.itemIndex,
    },
  };
}

async function requestAport(nodeContext, credentials, requestOptions) {
  const baseUrl = normalizeBaseUrl(credentials.baseUrl);
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (credentials.apiKey) {
    headers.Authorization = `Bearer ${credentials.apiKey}`;
  }

  return nodeContext.helpers.httpRequest({
    method: requestOptions.method,
    url: `${baseUrl}${requestOptions.path}`,
    headers,
    body: requestOptions.body,
    qs: requestOptions.qs,
    json: true,
    timeout: Number(credentials.timeout || 10000),
  });
}

class Aport {
  constructor() {
    this.description = {
      displayName: "APort",
      name: "aport",
      icon: "file:aport.svg",
      group: ["transform"],
      version: 1,
      description: "Verify APort passports and policy checks inside n8n workflows",
      defaults: {
        name: "APort Verify",
      },
      inputs: ["main"],
      outputs: ["main"],
      credentials: [
        {
          name: "aportApi",
          required: false,
        },
      ],
      properties: [
        {
          displayName: "Operation",
          name: "operation",
          type: "options",
          noDataExpression: true,
          options: [
            {
              name: "Verify Policy",
              value: "verifyPolicy",
              description: "Verify an APort passport against a policy pack",
              action: "Verify an agent passport against an APort policy",
            },
            {
              name: "Get Passport",
              value: "getPassport",
              description: "Fetch passport details for an APort agent",
              action: "Get an APort passport",
            },
          ],
          default: "verifyPolicy",
        },
        {
          displayName: "Agent ID",
          name: "agentId",
          type: "string",
          required: true,
          default: "={{ $json.agent_id || $json.agentId || $json.passport_id || $json.passportId }}",
          description: "APort agent or passport identifier to verify.",
        },
        {
          displayName: "Policy Pack",
          name: "policyId",
          type: "string",
          required: true,
          default: DEFAULT_POLICY_ID,
          displayOptions: {
            show: {
              operation: ["verifyPolicy"],
            },
          },
          description: "APort policy pack identifier, for example finance.payment.refund.v1.",
        },
        {
          displayName: "Include Input JSON in Context",
          name: "includeInputJson",
          type: "boolean",
          default: true,
          displayOptions: {
            show: {
              operation: ["verifyPolicy"],
            },
          },
          description:
            "Whether to merge the incoming item JSON into the APort verification context.",
        },
        {
          displayName: "Context Mode",
          name: "contextMode",
          type: "options",
          noDataExpression: true,
          displayOptions: {
            show: {
              operation: ["verifyPolicy"],
            },
          },
          options: [
            {
              name: "JSON",
              value: "json",
            },
            {
              name: "Key/Value",
              value: "keyValue",
            },
          ],
          default: "json",
          description: "How to provide extra verification context.",
        },
        {
          displayName: "Context JSON",
          name: "contextJson",
          type: "json",
          default: "{}",
          displayOptions: {
            show: {
              operation: ["verifyPolicy"],
              contextMode: ["json"],
            },
          },
          description: "Additional context object sent to APort.",
        },
        {
          displayName: "Context Fields",
          name: "contextPairs",
          type: "fixedCollection",
          typeOptions: {
            multipleValues: true,
          },
          default: {},
          placeholder: "Add Field",
          displayOptions: {
            show: {
              operation: ["verifyPolicy"],
              contextMode: ["keyValue"],
            },
          },
          options: [
            {
              displayName: "Values",
              name: "values",
              values: [
                {
                  displayName: "Key",
                  name: "key",
                  type: "string",
                  default: "",
                },
                {
                  displayName: "Value",
                  name: "value",
                  type: "string",
                  default: "",
                },
              ],
            },
          ],
        },
        {
          displayName: "Throw on Deny",
          name: "throwOnDeny",
          type: "boolean",
          default: false,
          displayOptions: {
            show: {
              operation: ["verifyPolicy"],
            },
          },
          description:
            "Whether to fail the node when APort denies verification instead of returning a denied route.",
        },
        {
          displayName: "Include Raw APort Response",
          name: "includeRawResponse",
          type: "boolean",
          default: false,
          description: "Whether to include the full APort response in output.",
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const credentials = await this.getCredentials("aportApi").catch(() => ({}));
    const returnData = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      try {
        const operation = this.getNodeParameter("operation", itemIndex);
        const agentId = this.getNodeParameter("agentId", itemIndex);

        if (!agentId || typeof agentId !== "string") {
          throw new Error("Agent ID is required");
        }

        if (operation === "getPassport") {
          const response = await requestAport(this, credentials, {
            method: "GET",
            path: `/api/verify/${encodeURIComponent(agentId)}`,
            qs: {
              policy_pack: DEFAULT_POLICY_ID,
              context: "{}",
            },
          });

          returnData.push({
            json: {
              ...items[itemIndex].json,
              aport_passport: response,
            },
            pairedItem: {
              item: itemIndex,
            },
          });
          continue;
        }

        const policyId = this.getNodeParameter("policyId", itemIndex);
        const context = buildContext(this, itemIndex, items[itemIndex]);
        const response = await requestAport(this, credentials, {
          method: "POST",
          path: `/api/verify/policy/${encodeURIComponent(policyId)}`,
          body: buildVerifyPayload(agentId, policyId, context),
        });

        if (!isVerified(response) && this.getNodeParameter("throwOnDeny", itemIndex)) {
          throw new Error(response.message || response.reason || "APort verification denied");
        }

        returnData.push(
          toOutputItem(items[itemIndex], response, {
            includeRawResponse: this.getNodeParameter("includeRawResponse", itemIndex),
            itemIndex,
          })
        );
      } catch (error) {
        if (this.continueOnFail && this.continueOnFail()) {
          returnData.push({
            json: {
              ...items[itemIndex].json,
              aport_error: error.message,
            },
            pairedItem: {
              item: itemIndex,
            },
          });
          continue;
        }

        throw error;
      }
    }

    return [returnData];
  }
}

module.exports = {
  Aport,
  buildVerifyPayload,
  coerceValue,
  isVerified,
  normalizeBaseUrl,
  parseJsonObject,
  toOutputItem,
};
