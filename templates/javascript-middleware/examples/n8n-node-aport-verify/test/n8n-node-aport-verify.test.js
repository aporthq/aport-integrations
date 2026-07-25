const { NodeOperationError } = require('n8n-workflow');
const n8nNodeTestHelper = require('n8n-node-test-helper');
const aportVerifyNode = require('../n8n-node-aport-verify');
const { APortClient } = require('@aporthq/sdk-node');

jest.mock('@aporthq/sdk-node');

describe('APort Verify Node', () => {
  beforeAll(() => {
    n8nNodeTestHelper.init();
  });

  afterAll(() => {
    n8nNodeTestHelper.destroy();
  });

  beforeEach(() => {
    APortClient.mockClear();
  });

  it('should throw error if agentId is missing', async () => {
    const node = new aportVerifyNode();
    node.getInputData = () => [{ json: {} }];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return '';
      if (name === 'policy') return 'finance.payment.refund.v1';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      return undefined;
    };
    node.continueOnFail = () => false;
    node.prepareOutputData = (data) => data;

    await expect(node.execute()).rejects.toThrow('Agent ID is required');
  });

  it('should call APortClient.verify and return result', async () => {
    const mockVerify = jest.fn().mockResolvedValue({
      verified: true,
      passport: { agentId: 'agt_inst_test_123' },
    });
    APortClient.mockImplementation(() => ({
      verify: mockVerify,
    }));

    const node = new aportVerifyNode();
    node.getInputData = () => [{ json: { some: 'data' } }];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return 'agt_inst_test_123';
      if (name === 'policy') return 'finance.payment.refund.v1';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      return undefined;
    };
    node.continueOnFail = () => false;
    node.prepareOutputData = (data) => data;

    const output = await node.execute();

    expect(mockVerify).toHaveBeenCalledWith('finance.payment.refund.v1', 'agt_inst_test_123', {});
    expect(output).toEqual([
      {
        json: {
          some: 'data',
          aportVerification: {
            verified: true,
            passport: { agentId: 'agt_inst_test_123' },
          },
        },
      },
    ]);
  });

  it('should continue on fail if enabled', async () => {
    const mockVerify = jest.fn().mockRejectedValue(new Error('API error'));
    APortClient.mockImplementation(() => ({
      verify: mockVerify,
    }));

    const node = new aportVerifyNode();
    node.getInputData = () => [{ json: {} }];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return 'agt_inst_test_123';
      if (name === 'policy') return 'finance.payment.refund.v1';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      return undefined;
    };
    node.continueOnFail = () => true;
    node.prepareOutputData = (data) => data;

    const output = await node.execute();

    expect(output).toEqual([{ json: { error: 'API error' } }]);
  });
});
