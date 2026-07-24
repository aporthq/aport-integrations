const { INodeType, INodeTypeDescription, INodeExecutionData } = require('n8n-workflow');
const APortClient = require('../../tools/cli/src/client');

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
          placeholder: 'agt_inst_xyz789',
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
          displayName: 'Context (JSON)',
          name: 'context',
          type: 'string',
          default: '{}',
          description: 'Additional context as JSON string',
          placeholder: '{"amount": 100}',
        },
        {
          displayName: 'API Key',
          name: 'apiKey',
          type: 'string',
          default: '',
          description: 'APort API key (optional, can be set in environment variable APORT_API_KEY)',
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
      const item = items[i];
      const agentId = this.getNodeParameter('agentId', i);
      const policy = this.getNodeParameter('policy', i);
      const contextStr = this.getNodeParameter('context', i);
      const apiKey = this.getNodeParameter('apiKey', i);

      let context = {};
      try {
        context = contextStr ? JSON.parse(contextStr) : {};
      } catch (error) {
        throw new Error(`Invalid JSON in context: ${error.message}`);
      }

      const client = new APortClient({ apiKey: apiKey || process.env.APORT_API_KEY });

      try {
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
