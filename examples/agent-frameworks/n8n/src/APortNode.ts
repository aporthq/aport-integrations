import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  INodeParameters,
} from "n8n-workflow";
import axios from "axios";

export class APortNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: "APort Verify",
    name: "aportVerify",
    icon: "file:aport.svg",
    group: ["transform"],
    version: 1,
    description: "Verify an agent against an APort policy pack",
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
        placeholder: "Enter agent ID",
        required: true,
        description: "Agent ID to verify",
      },
      {
        displayName: "Policy Pack",
        name: "policyPack",
        type: "string",
        default: "finance.payment.refund.v1",
        placeholder: "Enter policy pack ID",
        required: true,
        description: "Policy pack to verify against",
      },
      {
        displayName: "Context",
        name: "context",
        type: "string",
        default: "{}",
        placeholder: "JSON string with additional context",
        description: "Optional JSON string with additional context",
      },
      {
        displayName: "APort API Base URL",
        name: "baseUrl",
        type: "string",
        default: "https://aport.io",
        placeholder: "APort API base URL",
        description: "Base URL for the APort API",
      },
      {
        displayName: "API Key",
        name: "apiKey",
        type: "string",
        typeOptions: {
          password: true,
        },
        default: "",
        placeholder: "APort API key",
        description: "API key for authentication (optional)",
      },
    ],
  };

  async execute(this: INodeType, items: INodeExecutionData[]) {
    const returnData: INodeExecutionData[] = [];

    for (const item of items) {
      const agentId = this.getNodeParameter("agentId", 0, "", { extractValue: true }) as string;
      const policyPack = this.getNodeParameter("policyPack", 0, "", { extractValue: true }) as string;
      const contextStr = this.getNodeParameter("context", 0, "{}", { extractValue: true }) as string;
      const baseUrl = this.getNodeParameter("baseUrl", 0, "https://aport.io", { extractValue: true }) as string;
      const apiKey = this.getNodeParameter("apiKey", 0, "", { extractValue: true }) as string;

      let context = {};
      try {
        context = JSON.parse(contextStr);
      } catch (error) {
        returnData.push({
          json: {
            error: "Invalid JSON in context",
            message: (error as Error).message,
          },
        });
        continue;
      }

      try {
        const response = await axios.post(
          `${baseUrl}/api/verify/policy/${policyPack}`,
          {
            context: {
              agent_id: agentId,
              policy_id: policyPack,
              context: context,
            },
          },
          {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
          }
        );

        const data = response.data;
        const decision = data.decision || data.data?.decision;

        returnData.push({
          json: {
            verified: data.verified,
            passport: data.passport,
            message: data.message || (decision ? (decision.allow ? "Verified" : "Denied") : ""),
            decision: decision,
          },
        });
      } catch (error) {
        returnData.push({
          json: {
            error: "Verification failed",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return returnData;
  }
}
