const {
  buildOutputPayload,
  createAPortClient,
  isAllowedDecision,
  parseContextJson,
  verifyPassport,
} = require("../../src/aportVerification");

function toExecutionError(node, error, itemIndex) {
  try {
    const { NodeOperationError } = require("n8n-workflow");
    return new NodeOperationError(node, error, { itemIndex });
  } catch (_) {
    error.itemIndex = itemIndex;
    return error;
  }
}

class APortPassportRouter {
  constructor() {
    this.description = {
      displayName: "APort Passport Router",
      name: "aPortPassportRouter",
      icon: "file:aport.svg",
      group: ["transform"],
      version: 1,
      subtitle: "={{$parameter[\"policyId\"]}}",
      description: "Verify an APort passport and route items through Allowed or Denied outputs.",
      defaults: {
        name: "APort Passport Router",
      },
      inputs: ["main"],
      outputs: ["main", "main"],
      outputNames: ["Allowed", "Denied"],
      credentials: [
        {
          name: "aportApi",
          required: true,
        },
      ],
      properties: [
        {
          displayName: "Passport ID",
          name: "passportId",
          type: "string",
          default: "",
          required: true,
          description: "APort passport or agent ID to verify.",
        },
        {
          displayName: "Policy ID",
          name: "policyId",
          type: "string",
          default: "finance.payment.refund.v1",
          required: true,
          description: "APort policy pack ID to verify against.",
        },
        {
          displayName: "Context",
          name: "contextJson",
          type: "json",
          default: "{}",
          description: "JSON context sent to APort for policy evaluation.",
        },
        {
          displayName: "Idempotency Key",
          name: "idempotencyKey",
          type: "string",
          default: "",
          description: "Optional idempotency key for repeat-safe policy checks.",
        },
        {
          displayName: "Include Input Data",
          name: "includeInputData",
          type: "boolean",
          default: true,
          description: "Whether to keep the incoming item JSON and add the APort result under the aport field.",
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const credentials = await this.getCredentials("aportApi");
    const client = createAPortClient(credentials);
    const allowedItems = [];
    const deniedItems = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const item = items[itemIndex];

      try {
        const passportId = this.getNodeParameter("passportId", itemIndex);
        const policyId = this.getNodeParameter("policyId", itemIndex);
        const contextJson = this.getNodeParameter("contextJson", itemIndex, "{}");
        const idempotencyKey = this.getNodeParameter("idempotencyKey", itemIndex, "");
        const includeInputData = this.getNodeParameter("includeInputData", itemIndex, true);
        const context = parseContextJson(contextJson);
        const response = await verifyPassport({
          client,
          passportId,
          policyId,
          context,
          idempotencyKey,
        });
        const json = buildOutputPayload({
          inputJson: item.json,
          includeInputData,
          passportId,
          policyId,
          response,
        });
        const outputItem = {
          json,
          pairedItem: {
            item: itemIndex,
          },
        };

        if (isAllowedDecision(response)) {
          allowedItems.push(outputItem);
        } else {
          deniedItems.push(outputItem);
        }
      } catch (error) {
        if (!this.continueOnFail()) {
          throw toExecutionError(this.getNode(), error, itemIndex);
        }

        deniedItems.push({
          json: {
            ...item.json,
            aport: {
              allowed: false,
              error: error.message,
            },
          },
          pairedItem: {
            item: itemIndex,
          },
        });
      }
    }

    return [allowedItems, deniedItems];
  }
}

module.exports = {
  APortPassportRouter,
};
