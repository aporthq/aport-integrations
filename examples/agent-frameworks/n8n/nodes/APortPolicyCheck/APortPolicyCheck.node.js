function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "https://aport.io").replace(/\/+$/, "");
}

function parseContext(rawContext) {
  const trimmed = String(rawContext || "").trim();

  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed);

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Context must be a JSON object.");
  }

  return parsed;
}

class APortPolicyCheck {
  constructor() {
    this.description = {
      displayName: "APort Policy Check",
      name: "aportPolicyCheck",
      icon: "fa:shield-alt",
      group: ["transform"],
      version: 1,
      description: "Verify an APort agent passport against a policy pack",
      defaults: {
        name: "APort Policy Check",
      },
      inputs: ["main"],
      outputs: ["main"],
      credentials: [
        {
          name: "aportApi",
          required: true,
        },
      ],
      properties: [
        {
          displayName: "Policy ID",
          name: "policyId",
          type: "string",
          default: "code.repository.merge.v1",
          required: true,
          description: "APort policy pack identifier to evaluate.",
        },
        {
          displayName: "Agent ID",
          name: "agentId",
          type: "string",
          default: "",
          required: true,
          placeholder: "agt_123",
          description: "Agent passport identifier to verify.",
        },
        {
          displayName: "Context",
          name: "context",
          type: "json",
          default: "{}",
          description: "JSON object sent as the APort verification context.",
        },
        {
          displayName: "Include Input Data",
          name: "includeInputData",
          type: "boolean",
          default: true,
          description:
            "Whether to keep the incoming item JSON and attach the APort result under the aport key.",
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const credentials = await this.getCredentials("aportApi");
    const baseUrl = normalizeBaseUrl(credentials.baseUrl);
    const returnData = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      try {
        const policyId = this.getNodeParameter("policyId", itemIndex);
        const agentId = this.getNodeParameter("agentId", itemIndex);
        const context = parseContext(
          this.getNodeParameter("context", itemIndex, "{}"),
        );
        const includeInputData = this.getNodeParameter(
          "includeInputData",
          itemIndex,
          true,
        );

        const response = await this.helpers.httpRequest({
          method: "POST",
          url: `${baseUrl}/api/verify/policy/${encodeURIComponent(policyId)}`,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json",
          },
          body: {
            agent_id: agentId,
            context,
            policy_id: policyId,
          },
          json: true,
        });

        const aportResult = {
          allow: Boolean(response.allow ?? response.allowed),
          reasons: Array.isArray(response.reasons) ? response.reasons : [],
          policyId,
          agentId,
          raw: response,
        };

        returnData.push({
          json: includeInputData
            ? {
                ...items[itemIndex].json,
                aport: aportResult,
              }
            : aportResult,
          pairedItem: {
            item: itemIndex,
          },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
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
  APortPolicyCheck,
  normalizeBaseUrl,
  parseContext,
};
