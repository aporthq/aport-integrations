const { nodeClass: APortVerifyNode } = require('../aport-n8n-node');
const assert = require('assert');

async function runTests() {
  const node = new APortVerifyNode();

  // Mock getInputData to return one item
  node.getInputData = () => [{ json: {} }];

  // Mock getNodeParameter to return test values
  node.getNodeParameter = (name) => {
    if (name === 'agentId') return 'agt_test_123';
    if (name === 'policy') return 'finance.payment.refund.v1';
    if (name === 'context') return '{"amount": 50}';
    if (name === 'apiKey') return '';
    return null;
  };

  // Mock prepareOutputData to just return the data
  node.prepareOutputData = (data) => data;

  // Mock APortClient to simulate verify
  const APortClient = require('../../tools/cli/src/client');
  APortClient.prototype.verify = async function (policy, agentId, context) {
    assert.strictEqual(policy, 'finance.payment.refund.v1');
    assert.strictEqual(agentId, 'agt_test_123');
    assert.deepStrictEqual(context, { amount: 50 });
    return { verified: true, passport: { agent_id: agentId } };
  };

  const results = await node.execute();

  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].json.success, true);
  assert.strictEqual(results[0].json.result.verified, true);
  assert.strictEqual(results[0].json.result.passport.agent_id, 'agt_test_123');

  console.log('All tests passed!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
