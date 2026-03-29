const { APortClient, BotConfig, getCachedVerification } = require('../src/index');

describe('APortClient', () => {
  let client;

  beforeEach(() => {
    client = new APortClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.aport.io',
    });
  });

  test('should be instantiable', () => {
    expect(client).toBeDefined();
    expect(client.apiKey).toBe('test-api-key');
    expect(client.baseUrl).toBe('https://api.aport.io');
  });

  test('should have verify method', () => {
    expect(typeof client.verify).toBe('function');
  });

  test('should have getStatus method', () => {
    expect(typeof client.getStatus).toBe('function');
  });

  test('should have listPolicies method', () => {
    expect(typeof client.listPolicies).toBe('function');
  });

  describe('verify', () => {
    test('should return verified result with mock data', async () => {
      const result = await client.verify('test-policy', 'agent-123', { source: 'test' });
      
      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
      expect(result.passport).toBeDefined();
      expect(result.passport.agentId).toBe('agent-123');
      expect(result.policy).toBe('test-policy');
    });
  });

  describe('getStatus', () => {
    test('should return status object', async () => {
      const result = await client.getStatus('agent-123');
      
      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-123');
      expect(result.status).toBe('active');
    });
  });

  describe('listPolicies', () => {
    test('should return list of policies', async () => {
      const result = await client.listPolicies();
      
      expect(result).toBeDefined();
      expect(result.policies).toBeDefined();
      expect(Array.isArray(result.policies)).toBe(true);
      expect(result.policies.length).toBeGreaterThan(0);
    });
  });
});

describe('BotConfig', () => {
  test('should be instantiable', () => {
    const config = new BotConfig();
    expect(config).toBeDefined();
  });

  test('should create APortClient instance', () => {
    const config = new BotConfig();
    const client = config.getClient();
    
    expect(client).toBeInstanceOf(APortClient);
  });
});
