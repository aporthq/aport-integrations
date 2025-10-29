const axios = require("axios");

class APort {
  description = {
    displayName: "APort",
    name: "aport",
    icon: "file:aport.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      "Interact with APort API for agent verification and policy compliance",
    defaults: {
      name: "APort",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "aportApi",
        required: false,
        displayOptions: {
          show: {
            operation: ["createPassport", "suspendPassport"],
          },
        },
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
            description: "Verify an agent against a policy",
            action: "Verify an agent against a policy",
          },
          {
            name: "Get Passport",
            value: "getPassport",
            description: "Get passport information for an agent",
            action: "Get passport information",
          },
          {
            name: "Create Passport",
            value: "createPassport",
            description: "Create a new agent passport",
            action: "Create a new passport",
          },
          {
            name: "Suspend Passport",
            value: "suspendPassport",
            description: "Suspend an agent passport",
            action: "Suspend a passport",
          },
          {
            name: "List Policy Packs",
            value: "listPolicyPacks",
            description: "List all available policy packs",
            action: "List all policy packs",
          },
        ],
        default: "verifyPolicy",
      },

      // Verify Policy fields
      {
        displayName: "Policy ID",
        name: "policyId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            operation: ["verifyPolicy"],
          },
        },
        description: "Policy pack identifier (e.g., finance.payment.refund.v1)",
      },
      {
        displayName: "Agent ID",
        name: "agentId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            operation: ["verifyPolicy", "getPassport", "suspendPassport"],
          },
        },
        description: "Agent identifier",
      },
      {
        displayName: "Context",
        name: "context",
        type: "json",
        default: "{}",
        displayOptions: {
          show: {
            operation: ["verifyPolicy"],
          },
        },
        description: "Additional context for verification (JSON format)",
      },

      // Create Passport fields
      {
        displayName: "Passport Data",
        name: "passportData",
        type: "json",
        default:
          '{\n  "name": "",\n  "role": "",\n  "description": "",\n  "capabilities": [],\n  "limits": {},\n  "contact": ""\n}',
        required: true,
        displayOptions: {
          show: {
            operation: ["createPassport"],
          },
        },
        description: "Complete passport data in JSON format",
      },

      // Suspend Passport fields
      {
        displayName: "Reason",
        name: "reason",
        type: "string",
        default: "Suspended via n8n",
        displayOptions: {
          show: {
            operation: ["suspendPassport"],
          },
        },
        description: "Reason for suspension",
      },
    ],
  };

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const operation = this.getNodeParameter("operation", 0);

    for (let i = 0; i < items.length; i++) {
      try {
        let result;

        // Get credentials if available
        const credentials = await this.getCredentials("aportApi").catch(
          () => ({})
        );
        const baseUrl = credentials.baseUrl || "https://api.aport.io";
        const apiKey = credentials.apiKey;

        // Create axios instance
        const client = axios.create({
          baseURL: baseUrl,
          headers: {
            ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        if (operation === "verifyPolicy") {
          const policyId = this.getNodeParameter("policyId", i);
          const agentId = this.getNodeParameter("agentId", i);
          const contextStr = this.getNodeParameter("context", i);
          const context =
            typeof contextStr === "string"
              ? JSON.parse(contextStr)
              : contextStr;

          const response = await client.post(`/api/verify/policy/${policyId}`, {
            context: {
              agent_id: agentId,
              policy_id: policyId,
              ...context,
            },
          });

          result = response.data;
        } else if (operation === "getPassport") {
          const agentId = this.getNodeParameter("agentId", i);
          const response = await client.get(`/api/verify/${agentId}`, {
            params: {
              policy_pack: "code.repository.merge.v1",
              context: JSON.stringify({}),
            },
          });

          result = response.data;
        } else if (operation === "createPassport") {
          if (!apiKey) {
            throw new Error("API key is required for creating passports");
          }

          const passportDataStr = this.getNodeParameter("passportData", i);
          const passportData =
            typeof passportDataStr === "string"
              ? JSON.parse(passportDataStr)
              : passportDataStr;

          const response = await client.post("/api/issue", passportData);
          result = response.data;
        } else if (operation === "suspendPassport") {
          const agentId = this.getNodeParameter("agentId", i);
          const reason = this.getNodeParameter("reason", i);

          const response = await client.post("/api/suspend", {
            agent_id: agentId,
            reason: reason,
          });

          result = response.data;
        } else if (operation === "listPolicyPacks") {
          const response = await client.get("/api/policies");
          result = response.data;
        }

        returnData.push({ json: result });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
              details: error.response?.data || null,
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

module.exports = { APort };
