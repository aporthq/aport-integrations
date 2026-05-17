const {
  buildContext,
  formatError,
  isApproved,
  normalizeBaseUrl,
} = require("./utils");

class APortVerify {
  constructor() {
    this.description = {
      displayName: "APort Verify",
      name: "aportVerify",
      group: ["transform"],
      version: 1,
      description:
        "Verify an APort passport against a policy and route the workflow by decision.",
      defaults: {
        name: "APort Verify",
      },
      inputs: ["main"],
      outputs: ["main", "main", "main"],
      outputNames: ["Approved", "Denied", "Error"],
      credentials: [
        {
          name: "aportApi",
          required: false,
        },
      ],
      properties: [
        {
          displayName: "Passport ID",
          name: "passportId",
          type: "string",
          default: "={{$json.agent_id || $json.passport_id || $json.passportId || ''}}",
          required: true,
          description: "Agent passport identifier to verify.",
        },
        {
          displayName: "Policy Pack",
          name: "policyPack",
          type: "string",
          default: "code.repository.merge.v1",
          required: true,
          description: "APort policy pack identifier.",
        },
        {
          displayName: "Context Source",
          name: "contextMode",
          type: "options",
          default: "input",
          options: [
            {
              name: "Input JSON",
              value: "input",
              description: "Send the incoming item JSON as APort context.",
            },
            {
              name: "JSON Object",
              value: "json",
              description: "Send a JSON object configured on this node.",
            },
            {
              name: "Key/Value Fields",
              value: "fields",
              description: "Build context from manually configured fields.",
            },
          ],
        },
        {
          displayName: "Context JSON",
          name: "contextJson",
          type: "json",
          default: "{}",
          displayOptions: {
            show: {
              contextMode: ["json"],
            },
          },
          description: "JSON object sent as the APort verification context.",
        },
        {
          displayName: "Context Fields",
          name: "contextFields",
          type: "fixedCollection",
          default: {},
          typeOptions: {
            multipleValues: true,
          },
          displayOptions: {
            show: {
              contextMode: ["fields"],
            },
          },
          options: [
            {
              name: "field",
              displayName: "Field",
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
                  description:
                    "String values are passed as-is. JSON-looking values are parsed.",
                },
              ],
            },
          ],
        },
        {
          displayName: "Include Input Data",
          name: "includeInputData",
          type: "boolean",
          default: true,
          description:
            "Whether to include the incoming item JSON in the routed output item.",
        },
        {
          displayName: "Base URL Override",
          name: "baseUrlOverride",
          type: "string",
          default: "",
          placeholder: "https://aport.io",
          description:
            "Optional base URL used when no APort credential base URL is configured.",
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const approvedItems = [];
    const deniedItems = [];
    const errorItems = [];

    let credentials = {};
    try {
      credentials = await this.getCredentials("aportApi");
    } catch (_error) {
      credentials = {};
    }

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const inputJson = items[itemIndex].json || {};
      const includeInputData = this.getNodeParameter(
        "includeInputData",
        itemIndex,
        true
      );

      try {
        const passportId = this.getNodeParameter("passportId", itemIndex, "");
        const policyPack = this.getNodeParameter("policyPack", itemIndex, "");
        const contextMode = this.getNodeParameter("contextMode", itemIndex, "input");
        const contextJson = this.getNodeParameter("contextJson", itemIndex, "{}");
        const contextFields = this.getNodeParameter("contextFields", itemIndex, {});
        const baseUrlOverride = this.getNodeParameter(
          "baseUrlOverride",
          itemIndex,
          ""
        );

        if (!passportId) {
          throw new Error("Passport ID is required.");
        }

        if (!policyPack) {
          throw new Error("Policy Pack is required.");
        }

        const context = buildContext({
          mode: contextMode,
          inputJson,
          contextJson,
          fields: contextFields,
        });
        const baseUrl = normalizeBaseUrl(credentials.baseUrl || baseUrlOverride);
        const headers = {
          "Content-Type": "application/json",
        };

        if (credentials.apiKey) {
          headers.Authorization = `Bearer ${credentials.apiKey}`;
        }

        const response = await this.helpers.httpRequest.call(this, {
          method: "POST",
          url: `${baseUrl}/api/verify/policy/${encodeURIComponent(policyPack)}`,
          headers,
          body: {
            context: {
              agent_id: passportId,
              passport_id: passportId,
              policy_id: policyPack,
              context,
            },
          },
          json: true,
          timeout: 10000,
        });

        const approved = isApproved(response);
        const outputItem = {
          json: {
            ...(includeInputData ? inputJson : {}),
            aport: {
              approved,
              passportId,
              policyPack,
              response,
            },
          },
          pairedItem: {
            item: itemIndex,
          },
        };

        if (approved) {
          approvedItems.push(outputItem);
        } else {
          deniedItems.push(outputItem);
        }
      } catch (error) {
        errorItems.push({
          json: {
            ...(includeInputData ? inputJson : {}),
            aport: {
              approved: false,
              error: formatError(error),
            },
          },
          pairedItem: {
            item: itemIndex,
          },
        });
      }
    }

    return [approvedItems, deniedItems, errorItems];
  }
}

module.exports = {
  APortVerify,
};
