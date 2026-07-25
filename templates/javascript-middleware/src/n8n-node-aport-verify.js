const { NodeOperationError } = require('n8n-workflow');
const { APortClient } = require('@aporthq/sdk-node');

module.exports = {
  description: {
    displayName: 'APort Verify',
    name: 'aportVerify',
    icon: 'file:aport.svg',
    group: ['transform'],
    version: 1,
    description: 'Verify an agent against an APort policy pack',
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
        placeholder: 'agt_inst_example_123',
        description: 'Agent ID to verify',
        required: true,
      },
      {
        displayName: 'Policy Pack',
        name: 'policy',
        type: 'string',
        default: 'finance.payment.refund.v1',
        placeholder: 'finance.payment.refund.v1',
        description: 'Policy pack identifier to verify against',
        required: true,
      },
      {
        displayName: 'Context',
        name: 'context',
        type: 'json',
        default: {},
        description: 'Additional context for verification',
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        description: 'APort API key (or set via environment variable APORT_API_KEY)',
      },
      {
        displayName: 'Base URL',
        name: 'baseUrl',
        type: 'string',
        default: 'https://api.aport.io',
        description: 'APort API base URL',
      },
    ],
  },

  async execute() {
    const items = this.getInputData();
    const returnData = [];

    // Get node parameters
    const apiKey = this.getNodeParameter('apiKey', 0);
    const baseUrl = this.getNodeParameter('baseUrl', 0);
    const policy = this.getNodeParameter('policy', 0);
    const context = this.getNodeParameter('context', 0);
    const client = new APortClient({
      apiKey: apiKey || process.env.APORT_API_KEY,
      baseUrl,
    });

    for (let i = 0; i < items.length; i++) {
      try {
        // Agent ID can be parameter or from input data
        let agentId = this.getNodeParameter('agentId', i, undefined, { extractValue: true });
        if (!agentId) {
          // Try to get from input item JSON
          agentId = this.getNodeParameter('agentId', 0, undefined, { extractValue: true });
          if (!agentId && items[i].json.agentId) {
            agentId = items[i].json.agentId;
          }
        }
        if (!agentId) {
          throw new NodeOperationError(this.getNode(), 'Agent ID is required');
        }

        // Verify agent
        const result = await client.verify(policy, agentId, context);

        // Attach verification result to output
        returnData.push({
          json: {
            ...items[i].json,
            aportVerification: result,
          },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error.message);
      }
    }

    return this.prepareOutputData(returnData);
  },
};
