'use strict';

const SpiffeClient = require('./spiffe-client');
const APortAdapter = require('./aport-adapter');

/**
 * SPIFFE-APort middleware for Express / generic use.
 *
 * Usage (Express):
 *   const { spiffeMiddleware } = require('aport-spiffe-bridge');
 *   app.use(spiffeMiddleware({ aportApiKey: '...' }));
 *
 * The middleware extracts the peer SPIFFE ID from the TLS client cert
 * (mTLS termination), converts it to an APort passport, verifies via APort,
 * and attaches `req.passport` + `req.spiffeId`.
 */
function spiffeMiddleware(opts = {}) {
  const client = new SpiffeClient(opts);
  const adapter = new APortAdapter();

  return async function middleware(req, res, next) {
    try {
      // 1. Extract peer certificate (mTLS) or header (reverse proxy)
      const peerCert = req.socket && req.socket.getPeerCertificate
        ? req.socket.getPeerCertificate()
        : null;

      const spiffeIdFromHeader = req.headers['x-spiffe-id'] || null;

      if (!peerCert && !spiffeIdFromHeader) {
        return res.status(401).json({
          error: 'No SPIFFE identity provided',
          hint: 'Configure mTLS or set X-SPIFFE-ID header',
        });
      }

      // 2. Build a minimal SVID-like object for translation
      const spiffeId = spiffeIdFromHeader || (peerCert && peerCert.subject && peerCert.subject.CN);
      if (!spiffeId) {
        return res.status(401).json({ error: 'Cannot extract SPIFFE ID from peer certificate' });
      }

      // Parse SPIFFE ID
      const parsedId = adapter._matchMapping(spiffeId) ? null : (() => {
        const match = spiffeId.match(/^spiffe:\/\/([^/]+)(\/.*)?$/);
        if (!match) return null;
        return { trustDomain: match[1], path: match[2] || '', fullId: spiffeId };
      })();

      if (!parsedId) {
        return res.status(401).json({ error: `Invalid SPIFFE ID: ${spiffeId}` });
      }

      // 3. Convert to APort passport
      const passport = adapter.spiffeToPassport(
        { raw: peerCert ? peerCert.raw : spiffeId, certs: peerCert ? [peerCert] : [] },
        parsedId
      );

      // 4. Verify via APort (optional, skip if no API key)
      if (adapter._matchMapping(parsedId.fullId) || opts.skipAportVerify) {
        const action = req.method.toLowerCase();
        const result = await adapter.verifyWithAPort(passport, action);
        if (!result.allowed && !opts.skipAportVerify) {
          return res.status(403).json({ error: 'APort policy denied', reason: result.reason });
        }
      }

      // 5. Attach to request
      req.spiffeId = parsedId;
      req.passport = passport;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { spiffeMiddleware };
