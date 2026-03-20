'use strict';

const path = require('path');

/**
 * Configuration for SPIFFE-APort Bridge
 */
const config = {
  /** Path to SPIFFE Workload API unix socket */
  workloadApiSocket: process.env.SPIFFE_ENDPOINT_SOCKET || '/tmp/spire-agent/public/api.sock',

  /** APort API key for authentication */
  aportApiKey: process.env.APORT_API_KEY || '',

  /** APort base URL */
  aportBaseUrl: process.env.APORT_BASE_URL || 'http://localhost:3000',

  /**
   * Mapping rules: transform SPIFFE IDs to APort roles/agents
   * Keys are glob patterns matched against SPIFFE ID paths.
   */
  mappingRules: [
    {
      pattern: 'spiffe://*/frontend/*',
      agentId: 'agent-frontend',
      roles: ['web-user', 'api-consumer'],
      policies: ['read-public', 'write-own'],
    },
    {
      pattern: 'spiffe://*/backend/*',
      agentId: 'agent-backend',
      roles: ['service', 'api-provider'],
      policies: ['read-all', 'write-data'],
    },
    {
      pattern: 'spiffe://*/admin/*',
      agentId: 'agent-admin',
      roles: ['admin', 'operator'],
      policies: ['read-all', 'write-all', 'manage-users'],
    },
  ],

  /** Refresh interval in ms for SVID watching */
  svidRefreshMs: parseInt(process.env.SVID_REFRESH_MS || '5000', 10),
};

module.exports = config;
