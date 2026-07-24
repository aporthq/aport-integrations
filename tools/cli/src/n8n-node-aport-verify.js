const { IExecuteFunctions } = require('n8n-core');
const { INodeType, INodeTypeDescription, INodeExecutionData } = require('n8n-workflow');
const APortClient = require('./client');

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
          placeholder: 'agt_inst_1234567890',
          description: 'Agent ID to verify',
          required: true,
        },
        {
          displayName: 'Policy Pack',
          name: 'policy',
          type: 'string',
          default: 'finance.payment.refund.v1',
          placeholder: 'finance.payment.refund.v1',
          description: 'Policy pack to verify against',
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
          description: 'APort API key (optional, can also be set via environment variable APORT_API_KEY)',
          required: false,
        },
        {
          displayName: 'Base URL',
          name: 'baseUrl',
          type: 'string',
          default: 'https://aport.io',
          description: 'APort API base URL',
          required: false,
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const length = items.length;

    for (let i = 0; i < length; i++) {
      try {
        const agentId = this.getNodeParameter('agentId', i);
        const policy = this.getNodeParameter('policy', i);
        const context = this.getNodeParameter('context', i, {});
        const apiKey = this.getNodeParameter('apiKey', i, '');
        const baseUrl = this.getNodeParameter('baseUrl', i, 'https://aport.io');

        const client = new APortClient({ apiKey, baseUrl });

        const result = await client.verify(policy, agentId, context);

        returnData.push({
          json: {
            success: true,
            result,
          },
        });
      } catch (error) {
        returnData.push({
          json: {
            success: false,
            error: error.message,
          },
        });
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { nodeClass: APortVerifyNode };
