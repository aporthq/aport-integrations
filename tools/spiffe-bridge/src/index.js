#!/usr/bin/env node
'use strict';

const SpiffeClient = require('./spiffe-client');
const APortAdapter = require('./aport-adapter');

/**
 * SPIFFE-APort Bridge — Entry point.
 *
 * Connects to the SPIFFE Workload API, fetches SVIDs,
 * and translates them into APort passport format.
 */
async function main() {
  console.log('[spiffe-bridge] Starting SPIFFE ↔ APort Bridge...');

  const client = new SpiffeClient();
  const adapter = new APortAdapter();

  try {
    const { svid, bundle } = await client.fetchSVID();
    const parsedId = client.parseSpiffeId(svid);

    console.log(`[spiffe-bridge] Trust Domain : ${parsedId.trustDomain}`);
    console.log(`[spiffe-bridge] Workload Path: ${parsedId.path}`);
    console.log(`[spiffe-bridge] SPIFFE ID    : ${parsedId.fullId}`);

    const passport = adapter.spiffeToPassport(svid, parsedId);
    console.log(`[spiffe-bridge] APort Agent  : ${passport.agentId}`);
    console.log(`[spiffe-bridge] Roles        : ${passport.roles.join(', ')}`);
    console.log(`[spiffe-bridge] Policies     : ${passport.policies.join(', ')}`);

    const identity = adapter.getAgentIdentity(svid, parsedId);
    console.log(`[spiffe-bridge] Agent ID     : ${identity.id}`);
    console.log(`[spiffe-bridge] Workload Type: ${identity.workloadType}`);

    // Start watching for SVID rotation
    client.watchSVID((newSvid, newBundle) => {
      const newParsed = client.parseSpiffeId(newSvid);
      console.log(`[spiffe-bridge] SVID rotated: ${newParsed.fullId}`);
    });

    console.log('[spiffe-bridge] Watching for SVID updates. Press Ctrl+C to stop.');

    process.on('SIGINT', () => {
      console.log('\n[spiffe-bridge] Shutting down...');
      client.stopWatch();
      process.exit(0);
    });
  } catch (err) {
    console.error(`[spiffe-bridge] Failed to start: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { main };

if (require.main === module) {
  main();
}
