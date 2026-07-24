const { NodeOperationError } = require('n8n-workflow');
const axios = require('axios');

class APortVerifyNode {
  constructor() {
    this.description = {
      displayName: 'APort Verify',
      name: 'aportVerify',
      icon: 'file:aport.svg',
      group: ['transform'],
      version: 1,
      description: 'Verify an agent against an APort policy',
      defaults: {
        name: 'APort Verify',
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
          placeholder: 'e.g. agt_inst_refund_bot_123',
          description: 'Agent ID to verify',
          required: true,
        },
        {
          displayName: 'Policy Pack',
          name: 'policy',
          type: 'string',
          default: 'finance.payment.refund.v1',
          placeholder: 'e.g. finance.payment.refund.v1',
          description: 'Policy pack to verify against',
          required: true,
        },
        {
          displayName: 'Context (JSON)',
          name: 'context',
          type: 'string',
          default: '{}',
          description: 'Additional context as JSON string',
          placeholder: '{"amount":50}',
        },
        {
          displayName: 'API Base URL',
          name: 'baseUrl',
          type: 'string',
          default: 'https://aport.io',
          description: 'Base URL for APort API',
        },
        {
          displayName: 'API Key',
          name: 'apiKey',
          type: 'string',
          default: '',
          description: 'APort API key (optional, required for some endpoints)',
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

    for (let i = 0; i < items.length; i++) {
      const agentId = this.getNodeParameter('agentId', i);
      const policy = this.getNodeParameter('policy', i);
      const contextStr = this.getNodeParameter('context', i);
      const baseUrl = this.getNodeParameter('baseUrl', i);
      const apiKey = this.getNodeParameter('apiKey', i);

      let context = {};
      if (contextStr) {
        try {
          context = JSON.parse(contextStr);
        } catch (error) {
          throw new NodeOperationError(this.getNode(), `Invalid JSON in context: ${error.message}`, { itemIndex: i });
        }
      }

      try {
        const headers = {};
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await axios.post(
          `${baseUrl.replace(/\/$/, '')}/api/verify/policy/${encodeURIComponent(policy)}`,
          {
            context: {
              agent_id: agentId,
              policy_id: policy,
              context: context,
            },
          },
          { headers }
        );

        returnData.push({
          json: response.data,
        });
      } catch (error) {
        if (error.response && error.response.data) {
          throw new NodeOperationError(this.getNode(), `API Error: ${error.response.data.message || error.response.statusText}`, { itemIndex: i });
        }
        throw new NodeOperationError(this.getNode(), `Request Error: ${error.message}`, { itemIndex: i });
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { nodeClass: APortVerifyNode };
