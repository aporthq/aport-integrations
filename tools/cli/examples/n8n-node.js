/**
 * Custom n8n node for APort verification
 * This node verifies an agent's passport against a specified policy pack
 * and routes the workflow based on the verification result.
 */

const { INodeType, INodeTypeDescription, INodeExecutionData, NodeOperationError } = require('n8n-workflow');
const APortClient = require('../src/client');

class APortVerifyNode {
  constructor() {
    this.description = {
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
      outputs: ['main', 'main'],
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
          description: 'APort API key (optional, can also be set via environment variable)',
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
    const errorData = [];

    const apiKey = this.getNodeParameter('apiKey', 0, '');
    const baseUrl = this.getNodeParameter('baseUrl', 0, 'https://aport.io');

    const client = new APortClient({
      apiKey: apiKey || process.env.APORT_API_KEY,
      baseUrl,
    });

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

        const result = await client.verify(policy, agentId, context);

        // Determine if verification passed
        const decision = result.data?.decision || result.decision;
        const verified = decision?.allow === true;

        if (verified) {
          returnData.push({
            json: {
              verified: true,
              agentId,
              policy,
              decision,
              passport: result.passport || null,
            },
          });
          // Push null to error output for this item
          errorData.push(null);
        } else {
          // Verification failed, push to error output
          returnData.push(null);
          errorData.push({
            json: {
              verified: false,
              agentId,
              policy,
              decision,
              reason: result.reason || 'Verification failed',
            },
          });
        }
      } catch (error) {
        // On error, push null to main output and error info to error output
        returnData.push(null);
        errorData.push({
          json: {
            error: error.message,
          },
        });
      }
    }

    return [returnData, errorData];
  }
}

module.exports = { nodeClass: APortVerifyNode };
