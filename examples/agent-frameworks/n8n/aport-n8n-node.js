const { INodeType, INodeTypeDescription, INodeExecutionData, INodeParameters } = require('n8n-workflow');
const { APortClient } = require('@aporthq/sdk-node');

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
                    displayName: 'Policy Pack',
                    name: 'policy',
                    type: 'string',
                    default: '',
                    placeholder: 'finance.payment.refund.v1',
                    description: 'Policy pack identifier to verify against',
                    required: true,
                },
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
                    description: 'APort API key (optional if set in environment)',
                },
                {
                    displayName: 'API Base URL',
                    name: 'baseUrl',
                    type: 'string',
                    default: 'https://aport.io',
                    description: 'Base URL for APort API',
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        for (let i = 0; i < items.length; i++) {
            const policy = this.getNodeParameter('policy', i);
            const agentId = this.getNodeParameter('agentId', i);
            const context = this.getNodeParameter('context', i);
            const apiKey = this.getNodeParameter('apiKey', i);
            const baseUrl = this.getNodeParameter('baseUrl', i);

            const client = new APortClient({
                apiKey: apiKey || process.env.APORT_API_KEY,
                baseUrl: baseUrl || 'https://aport.io',
            });

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
