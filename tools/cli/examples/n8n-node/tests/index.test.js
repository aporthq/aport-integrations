const { nodeClass: APortVerifyNode } = require('../src/index');
const { NodeOperationError } = require('n8n-workflow');

describe('APortVerifyNode', () => {
  let node;

  beforeEach(() => {
    node = new APortVerifyNode();
  });

  test('should have correct description', () => {
    expect(node.description.name).toBe('aportPolicyCheck');
    expect(node.description.displayName).toBe('APort Policy Check');
    expect(node.description.inputs).toEqual(['main']);
    expect(node.description.outputs).toEqual(['main']);
  });

  test('should throw error on invalid JSON context', async () => {
    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (param, index) => {
      if (param === 'agentId') return 'agt_inst_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return index === 0 ? '{"amount":100}' : '{invalid}';
      if (param === 'apiKey') return '';
      return null;
    };
    node.prepareOutputData = (data) => data;

    await expect(node.execute()).rejects.toThrow('Invalid JSON in context');
  });

  test('should call verify and return result', async () => {
    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (param, index) => {
      if (param === 'agentId') return 'agt_inst_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      if (param === 'apiKey') return '';
      return null;
    };
    node.prepareOutputData = (data) => data;

    const mockVerify = jest.fn().mockResolvedValue({ verified: true });
    const mockClient = {
      verify: mockVerify,
    };
    jest.mock('@aporthq/sdk-node', () => ({
      APortClient: jest.fn(() => mockClient),
    }));

    // Clear require cache to apply mock
    jest.resetModules();

    // Re-import node after mocking
    const { nodeClass: APortVerifyNodeMocked } = require('../src/index');
    const nodeMocked = new APortVerifyNodeMocked();

    await nodeMocked.execute();

    expect(mockVerify).toHaveBeenCalledTimes(2);
    expect(mockVerify).toHaveBeenCalledWith('finance.payment.refund.v1', 'agt_inst_test', {});
  });

  test('should throw error on verification failure', async () => {
    node.getInputData = () => [{}];
    node.getNodeParameter = (param) => {
      if (param === 'agentId') return 'agt_inst_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      if (param === 'apiKey') return '';
      return null;
    };
    node.prepareOutputData = (data) => data;

    const mockVerify = jest.fn().mockRejectedValue(new Error('Verification failed'));
    const mockClient = {
      verify: mockVerify,
    };
    jest.mock('@aporthq/sdk-node', () => ({
      APortClient: jest.fn(() => mockClient),
    }));

    jest.resetModules();

    const { nodeClass: APortVerifyNodeMocked } = require('../src/index');
    const nodeMocked = new APortVerifyNodeMocked();

    await expect(nodeMocked.execute()).rejects.toThrow('Verification failed');
  });
});
