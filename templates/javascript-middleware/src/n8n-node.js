const { NodeOperationError } = require('n8n-workflow');

/**
 * Mock APort Client for template demonstration
 * In production, replace with: const { APortClient } = require("@aporthq/sdk-node");
 */
class MockAPortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl = options.baseUrl || process.env.APORT_BASE_URL || "https://api.aport.io";
  }

  async verify(policy, agentId, options = {}) {
    // Mock verification - always returns success for template
    return {
      verified: true,
      passport: {
        agentId: agentId,
        capabilities: ["read", "write"],
        limits: { requests: 1000, period: "1h" }
      },
      policy: policy,
      message: "Mock verification successful"
    };
  }
}

/**
 * n8n node for APort policy verification
 */
class APortPolicyCheckNode {
  constructor() {
    this.description = {
      displayName: 'APort Policy Check',
      name: 'aportPolicyCheck',
      icon: 'file:aport.svg',
      group: ['transform'],
      version: 1,
      description: 'Verify agent against APort policy',
      defaults: {
        name: 'APort Policy Check',
        color: '#06b6d4',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Agent ID',
          name: 'agentId',
          type: 'string',
          default: '',
          placeholder: 'Enter agent ID or use expression',
          description: 'Agent ID to verify',
          required: true,
        },
        {
          displayName: 'Policy Pack',
          name: 'policy',
          type: 'string',
          default: '',
          placeholder: 'finance.payment.refund.v1',
          description: 'Policy pack identifier',
          required: true,
        },
        {
          displayName: 'Context',
          name: 'context',
          type: 'json',
          default: {},
          description: 'Additional context for verification',
          required: false,
        },
        {
          displayName: 'API Key',
          name: 'apiKey',
          type: 'string',
          default: '',
          description: 'APort API key (optional, can use environment variable)',
          required: false,
          typeOptions: {
            password: true,
          },
        },
        {
          displayName: 'Base URL',
          name: 'baseUrl',
          type: 'string',
          default: 'https://api.aport.io',
          description: 'APort API base URL',
          required: false,
        },
        {
          displayName: 'Strict Mode',
          name: 'strict',
          type: 'boolean',
          default: true,
          description: 'Fail the node on verification errors',
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnData = [];

    // Create client instance
    const apiKey = this.getNodeParameter('apiKey', 0, '');
    const baseUrl = this.getNodeParameter('baseUrl', 0, 'https://api.aport.io');
    const client = new MockAPortClient({ apiKey, baseUrl });

    for (let i = 0; i < items.length; i++) {
      try {
        const agentId = this.getNodeParameter('agentId', i);
        const policy = this.getNodeParameter('policy', i);
        const context = this.getNodeParameter('context', i, {});

        if (!agentId) {
          throw new NodeOperationError(this.getNode(), 'Agent ID is required', { itemIndex: i });
        }
        if (!policy) {
          throw new NodeOperationError(this.getNode(), 'Policy pack is required', { itemIndex: i });
        }

        const result = await client.verify(policy, agentId, { context });

        if (!result.verified) {
          if (this.getNodeParameter('strict', i, true)) {
            throw new NodeOperationError(this.getNode(), `Verification failed: ${result.message || 'Unknown reason'}`, { itemIndex: i });
          }
        }

        returnData.push({
          json: {
            verified: result.verified,
            passport: result.passport,
            policy: result.policy,
            agentId: agentId,
            message: result.message,
          },
        });
      } catch (error) {
        if (this.getNodeParameter('strict', 0, true)) {
          throw error;
        }
        returnData.push({
          json: {
            verified: false,
            error: error.message,
          },
        });
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { APortPolicyCheckNode };
