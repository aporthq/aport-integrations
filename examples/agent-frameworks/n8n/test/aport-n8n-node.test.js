const { nodeClass: APortVerifyNode } = require('../aport-n8n-node');
const { NodeOperationError } = require('n8n-workflow');
const axios = require('axios');

jest.mock('axios');

describe('APortVerifyNode', () => {
  let node;

  beforeEach(() => {
    node = new APortVerifyNode();
  });

  test('should have correct description', () => {
    expect(node.description.name).toBe('aportVerify');
    expect(node.description.displayName).toBe('APort Verify');
  });

  test('should throw error on invalid JSON context', async () => {
    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (param, index) => {
      if (param === 'agentId') return 'agt_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return index === 0 ? '{invalid' : '{}';
      if (param === 'baseUrl') return 'https://aport.io';
      if (param === 'apiKey') return '';
      return null;
    };

    await expect(node.execute()).rejects.toThrow('Invalid JSON in context');
  });

  test('should call API and return data on success', async () => {
    const mockResponse = { data: { verified: true } };
    axios.post.mockResolvedValue(mockResponse);

    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (param, index) => {
      if (param === 'agentId') return 'agt_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      if (param === 'baseUrl') return 'https://aport.io';
      if (param === 'apiKey') return '';
      return null;
    };

    const result = await node.execute();

    expect(axios.post).toHaveBeenCalledWith(
      'https://aport.io/api/verify/policy/finance.payment.refund.v1',
      {
        context: {
          agent_id: 'agt_test',
          policy_id: 'finance.payment.refund.v1',
          context: {},
        },
      },
      { headers: {} }
    );

    expect(result).toHaveLength(2);
    expect(result[0].json).toEqual(mockResponse.data);
  });

  test('should throw NodeOperationError on API error', async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: 'API error' }, statusText: 'Bad Request' },
    });

    node.getInputData = () => [{}];
    node.getNodeParameter = (param) => {
      if (param === 'agentId') return 'agt_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      if (param === 'baseUrl') return 'https://aport.io';
      if (param === 'apiKey') return '';
      return null;
    };

    await expect(node.execute()).rejects.toThrow('API Error: API error');
  });

  test('should throw NodeOperationError on request error', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));

    node.getInputData = () => [{}];
    node.getNodeParameter = (param) => {
      if (param === 'agentId') return 'agt_test';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      if (param === 'baseUrl') return 'https://aport.io';
      if (param === 'apiKey') return '';
      return null;
    };

    await expect(node.execute()).rejects.toThrow('Request Error: Network error');
  });
});
