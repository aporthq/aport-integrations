const defaults = {
  workloadApiSocket: '/tmp/spire-agent/public/api.sock',
  aportApiKey: process.env.APORT_API_KEY,
  aportBaseUrl: process.env.APORT_BASE_URL || 'https://api.aport.io',
  mappingRules: { trustDomain: 'default' },
};

function loadConfig(overrides = {}) {
  return { ...defaults, ...overrides };
}
module.exports = { defaults, loadConfig };
