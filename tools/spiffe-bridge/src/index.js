const { loadConfig } = require('./config');
const SpiffeClient = require('./spiffe-client');
const AportAdapter = require('./aport-adapter');

async function main() {
  const config = loadConfig();
  const spiffe = new SpiffeClient(config.workloadApiSocket);
  const adapter = new AportAdapter(config.aportBaseUrl, config.aportApiKey);

  try {
    const svid = await spiffe.fetchX509SVID();
    const passport = adapter.spiffeToPassport(svid);
    console.log('APort Passport from SPIFFE:', JSON.stringify(passport, null, 2));
  } catch (e) {
    console.error('Bridge failed:', e.message);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { SpiffeClient, AportAdapter };
