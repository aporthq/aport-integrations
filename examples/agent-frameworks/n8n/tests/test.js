const { nodeClass: APortVerifyNode } = require('../aport-n8n-node');
const assert = require('assert');

async function runTests() {
    const node = new APortVerifyNode();

    // Mock input data
    node.getInputData = () => [
        {
            json: {
                policy: 'finance.payment.refund.v1',
                agentId: 'agt_inst_test_123',
                context: { amount: 50 },
                apiKey: 'test-api-key',
                baseUrl: 'https://aport.io',
            },
        },
    ];

    // Mock getNodeParameter to return values from input data
    node.getNodeParameter = (name, index) => {
        const input = node.getInputData()[index].json;
        return input[name];
    };

    // Mock prepareOutputData to just return the data
    node.prepareOutputData = (data) => data;

    // Mock APortClient to simulate verify method
    const originalAPortClient = require('@aporthq/sdk-node').APortClient;
    require('@aporthq/sdk-node').APortClient = class {
        constructor() {}
        async verify(policy, agentId, context) {
            assert.strictEqual(policy, 'finance.payment.refund.v1');
            assert.strictEqual(agentId, 'agt_inst_test_123');
            assert.deepStrictEqual(context, { amount: 50 });
            return { verified: true, passport: { agent_id: agentId } };
        }
    };

    try {
        const output = await node.execute();
        assert.strictEqual(output.length, 1);
        assert.strictEqual(output[0].json.success, true);
        assert.strictEqual(output[0].json.result.verified, true);
        console.log('✅ Test passed');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        // Restore original APortClient
        require('@aporthq/sdk-node').APortClient = originalAPortClient;
    }
}

runTests();
