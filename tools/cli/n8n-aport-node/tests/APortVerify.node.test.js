const { nodeClass: APortVerifyNode } = require('../APortVerify.node');
const { APortClient } = require('@aporthq/sdk-node');

jest.mock('@aporthq/sdk-node');

describe('APortVerifyNode', () => {
  let node;

  beforeEach(() => {
    node = new APortVerifyNode();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should have correct description', () => {
    expect(node.description.displayName).toBe('APort Verify');
    expect(node.description.name).toBe('aportVerify');
    expect(node.description.version).toBe(1);
  });

  test('should verify agent successfully', async () => {
    const mockVerify = jest.fn().mockResolvedValue({
      data: {
        decision: {
          allow: true,
          decision_id: 'dec123',
          reasons: [{ message: 'All good' }],
        },
      },
    });
    APortClient.mockImplementation(() => ({
      verify: mockVerify,
    }));

    // Mock input data and parameters
    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (param, index) => {
      if (param === 'agentId') return 'ap_agent_123';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      return null;
    };
    node.prepareOutputData = (data) => data;

    const output = await node.execute();

    expect(mockVerify).toHaveBeenCalledTimes(2);
    expect(output).toHaveLength(2);
    expect(output[0].json.success).toBe(true);
    expect(output[0].json.agentId).toBe('ap_agent_123');
  });

  test('should handle verification failure', async () => {
    const mockVerify = jest.fn().mockResolvedValue({
      data: {
        decision: {
          allow: false,
          decision_id: 'dec456',
          reasons: [{ message: 'Not allowed' }],
        },
      },
    });
    APortClient.mockImplementation(() => ({
      verify: mockVerify,
    }));

    node.getInputData = () => [{}];
    node.getNodeParameter = (param) => {
      if (param === 'agentId') return 'ap_agent_456';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      return null;
    };
    node.prepareOutputData = (data) => data;

    const output = await node.execute();

    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(output[0].json.success).toBe(false);
    expect(output[0].json.message).toBe('Verification failed');
  });

  test('should handle invalid JSON context', async () => {
    node.getInputData = () => [{}];
    node.getNodeParameter = (param) => {
      if (param === 'agentId') return 'ap_agent_789';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{invalid json}';
      return null;
    };
    node.prepareOutputData = (data) => data;

    await expect(node.execute()).rejects.toThrow('Invalid JSON in context');
  });

  test('should handle API errors', async () => {
    const mockVerify = jest.fn().mockRejectedValue(new Error('API error'));
    APortClient.mockImplementation(() => ({
      verify: mockVerify,
    }));

    node.getInputData = () => [{}];
    node.getNodeParameter = (param) => {
      if (param === 'agentId') return 'ap_agent_999';
      if (param === 'policy') return 'finance.payment.refund.v1';
      if (param === 'context') return '{}';
      return null;
    };
    node.prepareOutputData = (data) => data;

    const output = await node.execute();

    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(output[0].json.success).toBe(false);
    expect(output[0].json.error).toBe('API error');
  });
});
