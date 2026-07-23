const { INodeType, INodeTypeDescription } = require('n8n-workflow');
const { APortClient } = require('@aporthq/sdk-node');

class APortVerifyNode {
  constructor() {
    this.description = {
      displayName: 'APort Verify',
      name: 'aportVerify',
      icon: 'file:aport.svg',
      group: ['transform'],
      version: 1,
      description: 'Verify an agent passport using APort',
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
          placeholder: 'e.g. ap_a2d10232c6534523812423eec8a1425c',
          description: 'Agent passport ID to verify',
          required: true,
        },
        {
          displayName: 'Policy Pack',
          name: 'policy',
          type: 'string',
          default: 'finance.payment.refund.v1',
          description: 'Policy pack identifier to verify against',
          required: true,
        },
        {
          displayName: 'Context',
          name: 'context',
          type: 'string',
          default: '{}',
          description: 'Additional context as JSON string',
          required: false,
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const client = new APortClient();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const agentId = this.getNodeParameter('agentId', i);
      const policy = this.getNodeParameter('policy', i);
      const contextStr = this.getNodeParameter('context', i);

      let context = {};
      try {
        context = contextStr ? JSON.parse(contextStr) : {};
      } catch (error) {
        throw new Error(`Invalid JSON in context: ${error.message}`);
      }

      try {
        const result = await client.verify(policy, agentId, context);
        const decision = result.data?.decision || result.decision;

        if (decision && decision.allow) {
          returnData.push({
            json: {
              success: true,
              agentId,
              policy,
              decision,
            },
          });
        } else {
          returnData.push({
            json: {
              success: false,
              agentId,
              policy,
              decision,
              message: 'Verification failed',
            },
          });
        }
      } catch (error) {
        returnData.push({
          json: {
            success: false,
            agentId,
            policy,
            error: error.message,
          },
        });
      }
    }

    return this.prepareOutputData(returnData);
  }
}

module.exports = { nodeClass: APortVerifyNode };
