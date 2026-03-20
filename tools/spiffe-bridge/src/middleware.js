const SpiffeClient = require('./spiffe-client');
const AportAdapter = require('./aport-adapter');

function createSpiffeAportMiddleware(config) {
  const spiffe = new SpiffeClient(config.workloadApiSocket);
  const adapter = new AportAdapter(config.aportBaseUrl, config.aportApiKey);

  return async function spiffeAportMiddleware(req, res, next) {
    // Skip configured paths
    const skipPaths = config.skipPaths || ['/health', '/metrics'];
    if (skipPaths.some(p => req.path.startsWith(p))) return next();

    try {
      const cert = req.socket.getPeerCertificate();
      if (!cert || !cert.subject) return res.status(401).json({ error: 'no_client_cert' });

      const spiffeId = cert.subject.OU;
      if (!spiffeId?.startsWith('spiffe://')) {
        return res.status(401).json({ error: 'invalid_spiffe_id' });
      }

      const svid = {
        spiffeId,
        trustDomain: spiffeId.split('/')[2],
        workloadId: spiffeId.split('/').pop(),
      };

      req.spiffe = svid;
      req.agent = adapter.spiffeToPassport(svid);

      if (config.policyId) {
        const decision = await adapter.verifyWithAPort(req.agent, config.policyId, { path: req.path });
        if (!decision.allow) {
          return res.status(403).json({ error: 'policy_violation', reasons: decision.reasons });
        }
        req.policyResult = decision;
      }
      next();
    } catch (e) {
      res.status(500).json({ error: 'bridge_error', message: e.message });
    }
  };
}
module.exports = { createSpiffeAportMiddleware };
