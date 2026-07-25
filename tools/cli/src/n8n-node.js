const { NodeOperationError } = require("n8n-workflow");
const APortClient = require("./client");

class APortVerifyNode {
  constructor() {
    this.description = {
      displayName: "APort Verify",
      name: "aportVerify",
      icon: "file:aport.png",
      group: ["transform"],
      version: 1,
      description: "Verify an agent against a policy using APort",
      defaults: {
        name: "APort Verify",
        color: "#06b6d4",
      },
      inputs: ["main"],
      outputs: ["main"],
      properties: [
        {
          displayName: "Agent ID",
          name: "agentId",
          type: "string",
          default: "",
          placeholder: "ap_a2d10232c6534523812423eec8a1425c",
          description: "Agent ID to verify",
          required: true,
        },
        {
          displayName: "Policy Pack",
          name: "policy",
          type: "string",
          default: "finance.payment.refund.v1",
          placeholder: "finance.payment.refund.v1",
          description: "Policy pack to verify against",
          required: true,
        },
        {
          displayName: "Context (JSON)",
          name: "context",
          type: "string",
          default: "{}",
          description: "Additional context as JSON string",
          placeholder: '{"amount": 100}',
        },
        {
          displayName: "API Key",
          name: "apiKey",
          type: "string",
          default: "",
          description:
            "APort API key (optional, can also be set via environment variable APORT_API_KEY)",
          typeOptions: {
            password: true,
          },
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const clientCache = {};

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const agentId =
        this.getNodeParameter("agentId", i, item.agentId || undefined);
      const policy = this.getNodeParameter("policy", i, undefined);
      const contextStr = this.getNodeParameter("context", i, "{}");
      const apiKey = this.getNodeParameter("apiKey", i, undefined);

      let context = {};
      try {
        context = JSON.parse(contextStr);
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          `Invalid JSON in context parameter: ${error.message}`,
          { itemIndex: i }
        );
      }

      // Cache client per API key to avoid re-instantiation
      const clientKey = apiKey || "default";
      if (!clientCache[clientKey]) {
        clientCache[clientKey] = new APortClient({ apiKey });
      }
      const client = clientCache[clientKey];

      try {
        const result = await client.verify(policy, agentId, context);
        returnData.push({
          json: {
            agentId,
            policy,
            context,
            verified: result.verified || false,
            decision: result.data?.decision || result.decision || null,
            passport: result.passport || null,
            message: result.message || null,
          },
        });
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          `Verification failed: ${error.message}`,
          { itemIndex: i }
        );
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { APortVerifyNode };
