const { NodeOperationError } = require('n8n-workflow');
const { APortClient } = require('@aporthq/sdk-node');

class APortVerifyNode {
  constructor() {
    this.description = {
      displayName: 'APort Policy Check',
      name: 'aportPolicyCheck',
      icon: 'file:aport.svg',
      group: ['transform'],
      version: 1,
      description: 'Verify an agent against an APort policy pack',
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
          placeholder: 'e.g. agt_inst_xyz789',
          description: 'Agent identifier to verify',
          required: true,
        },
        {
          displayName: 'Policy Pack',
          name: 'policy',
          type: 'string',
          default: 'finance.payment.refund.v1',
          placeholder: 'e.g. finance.payment.refund.v1',
          description: 'Policy pack identifier to verify against',
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
          description: 'APort API key (optional if set in environment)',
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
      if (contextStr) {
        try {
          context = JSON.parse(contextStr);
        } catch (error) {
          throw new NodeOperationError(this.getNode(), `Invalid JSON in context: ${error.message}`, { itemIndex: i });
        }
      }

      const client = new APortClient({ apiKey });

      try {
        const result = await client.verify(policy, agentId, context);
        returnData.push({ json: result });
      } catch (error) {
        throw new NodeOperationError(this.getNode(), `Verification failed: ${error.message}`, { itemIndex: i });
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { nodeClass: APortVerifyNode };
