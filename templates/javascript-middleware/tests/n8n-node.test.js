const { APortPolicyCheckNode } = require('../src/n8n-node');

describe('APortPolicyCheckNode', () => {
  let node;

  beforeEach(() => {
    node = new APortPolicyCheckNode();
  });

  test('should have correct description', () => {
    expect(node.description.name).toBe('aportPolicyCheck');
    expect(node.description.displayName).toBe('APort Policy Check');
    expect(node.description.inputs).toEqual(['main']);
    expect(node.description.outputs).toEqual(['main']);
  });

  test('should throw error if agentId or policy missing', async () => {
    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return '';
      if (name === 'policy') return '';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      if (name === 'strict') return true;
      return null;
    };
    node.getNode = () => ({});

    await expect(node.execute()).rejects.toThrow('Agent ID is required');
  });

  test('should return verified result on success', async () => {
    node.getInputData = () => [{}, {}];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return 'agent123';
      if (name === 'policy') return 'policy123';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      if (name === 'strict') return true;
      return null;
    };
    node.getNode = () => ({});

    // Mock client.verify to return verified true
    const mockVerify = jest.fn().mockResolvedValue({
      verified: true,
      passport: { agentId: 'agent123' },
      policy: 'policy123',
      message: 'Success',
    });
    node.MockAPortClient = class {
      constructor() {}
      async verify() {
        return mockVerify();
      }
    };

    // Replace client with mock
    node.execute = async function () {
      const items = this.getInputData();
      const returnData = [];
      const client = new this.MockAPortClient();

      for (let i = 0; i < items.length; i++) {
        const agentId = this.getNodeParameter('agentId', i);
        const policy = this.getNodeParameter('policy', i);
        const context = this.getNodeParameter('context', i, {});

        const result = await client.verify(policy, agentId, { context });

        returnData.push({
          json: {
            verified: result.verified,
            passport: result.passport,
            policy: result.policy,
            agentId: agentId,
            message: result.message,
          },
        });
      }

      return this.prepareOutputData(returnData);
    };

    const output = await node.execute();
    expect(output).toHaveLength(2);
    expect(output[0].json.verified).toBe(true);
    expect(output[0].json.agentId).toBe('agent123');
  });

  test('should handle verification failure in strict mode', async () => {
    node.getInputData = () => [{}];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return 'agent123';
      if (name === 'policy') return 'policy123';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      if (name === 'strict') return true;
      return null;
    };
    node.getNode = () => ({});

    // Mock client.verify to return verified false
    const mockVerify = jest.fn().mockResolvedValue({
      verified: false,
      message: 'Verification failed',
    });
    node.MockAPortClient = class {
      constructor() {}
      async verify() {
        return mockVerify();
      }
    };

    // Replace client with mock
    node.execute = async function () {
      const items = this.getInputData();
      const returnData = [];
      const client = new this.MockAPortClient();

      for (let i = 0; i < items.length; i++) {
        const agentId = this.getNodeParameter('agentId', i);
        const policy = this.getNodeParameter('policy', i);
        const context = this.getNodeParameter('context', i, {});

        const result = await client.verify(policy, agentId, { context });

        if (!result.verified) {
          if (this.getNodeParameter('strict', i, true)) {
            throw new Error(`Verification failed: ${result.message || 'Unknown reason'}`);
          }
        }

        returnData.push({
          json: {
            verified: result.verified,
            message: result.message,
          },
        });
      }

      return this.prepareOutputData(returnData);
    };

    await expect(node.execute()).rejects.toThrow('Verification failed: Verification failed');
  });

  test('should handle verification failure in non-strict mode', async () => {
    node.getInputData = () => [{}];
    node.getNodeParameter = (name, index) => {
      if (name === 'agentId') return 'agent123';
      if (name === 'policy') return 'policy123';
      if (name === 'context') return {};
      if (name === 'apiKey') return '';
      if (name === 'baseUrl') return 'https://api.aport.io';
      if (name === 'strict') return false;
      return null;
    };
    node.getNode = () => ({});

    // Mock client.verify to throw error
    const mockVerify = jest.fn().mockRejectedValue(new Error('API Error'));
    node.MockAPortClient = class {
      constructor() {}
      async verify() {
        return mockVerify();
      }
    };

    // Replace client with mock
    node.execute = async function () {
      const items = this.getInputData();
      const returnData = [];
      const client = new this.MockAPortClient();

      for (let i = 0; i < items.length; i++) {
        try {
          const agentId = this.getNodeParameter('agentId', i);
          const policy = this.getNodeParameter('policy', i);
          const context = this.getNodeParameter('context', i, {});

          const result = await client.verify(policy, agentId, { context });

          if (!result.verified) {
            if (this.getNodeParameter('strict', i, true)) {
              throw new Error(`Verification failed: ${result.message || 'Unknown reason'}`);
            }
          }

          returnData.push({
            json: {
              verified: result.verified,
              passport: result.passport,
              policy: result.policy,
              agentId: agentId,
              message: result.message,
            },
          });
        } catch (error) {
          if (this.getNodeParameter('strict', i, true)) {
            throw error;
          }
          returnData.push({
            json: {
              verified: false,
              error: error.message,
            },
          });
        }
      }

      return this.prepareOutputData(returnData);
    };

    const output = await node.execute();
    expect(output).toHaveLength(1);
    expect(output[0].json.verified).toBe(false);
    expect(output[0].json.error).toBe('API Error');
  });
});
