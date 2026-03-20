'use strict';

const config = require('./config');

/**
 * APort Adapter — translates between SPIFFE identities and APort passport format.
 */
class APortAdapter {
  /**
   * Convert a SPIFFE SVID into an APort-compatible passport object.
   * @param {object} svid - SPIFFE X.509 SVID
   * @param {object} parsedId - parsed SPIFFE ID { trustDomain, path, fullId }
   * @returns {object} APort passport
   */
  spiffeToPassport(svid, parsedId) {
    const mapping = this._matchMapping(parsedId.fullId);

    const passport = {
      version: 1,
      issuer: 'spiffe-bridge',
      subject: parsedId.fullId,
      agentId: mapping ? mapping.agentId : `spiffe:${parsedId.trustDomain}`,
      trustDomain: parsedId.trustDomain,
      workloadPath: parsedId.path,
      roles: mapping ? mapping.roles : ['default'],
      policies: mapping ? mapping.policies : ['default'],
      svidFingerprint: this._fingerprint(svid),
      issuedAt: Date.now(),
      expiresAt: this._expiry(svid),
    };

    return passport;
  }

  /**
   * Verify a SPIFFE identity through APort's policy engine.
   * @param {object} passport - APort passport
   * @param {string} action - requested action (e.g. 'read', 'write')
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  async verifyWithAPort(passport, action) {
    if (!config.aportApiKey) {
      return { allowed: false, reason: 'APort API key not configured' };
    }

    try {
      const url = `${config.aportBaseUrl}/api/v1/verify`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.aportApiKey}`,
        },
        body: JSON.stringify({ passport, action }),
      });

      const data = await res.json();
      return { allowed: !!data.allowed, reason: data.reason || '' };
    } catch (err) {
      return { allowed: false, reason: err.message };
    }
  }

  /**
   * Derive a human-readable agent identity from a SPIFFE ID.
   * @param {object} svid
   * @param {object} parsedId
   * @returns {object}
   */
  getAgentIdentity(svid, parsedId) {
    const mapping = this._matchMapping(parsedId.fullId);
    const segments = parsedId.path.replace(/^\//, '').split('/').filter(Boolean);

    return {
      id: mapping ? mapping.agentId : `spiffe-${parsedId.trustDomain}-${segments[0] || 'unknown'}`,
      trustDomain: parsedId.trustDomain,
      workloadType: segments[0] || 'generic',
      workloadName: segments.slice(1).join('/') || 'default',
      roles: mapping ? mapping.roles : ['default'],
    };
  }

  // --- internals ---

  /**
   * Match a SPIFFE ID against configured mapping rules.
   * Supports simple glob: * matches any single path segment.
   */
  _matchMapping(spiffeId) {
    for (const rule of config.mappingRules) {
      if (this._globMatch(rule.pattern, spiffeId)) {
        return rule;
      }
    }
    return null;
  }

  _globMatch(pattern, str) {
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+') + '$'
    );
    return regex.test(str);
  }

  _fingerprint(svid) {
    try {
      const raw = svid.raw || svid.certChain || '';
      return require('crypto')
        .createHash('sha256')
        .update(typeof raw === 'string' ? raw : JSON.stringify(raw))
        .digest('hex')
        .slice(0, 16);
    } catch {
      return 'unknown';
    }
  }

  _expiry(svid) {
    try {
      // Try to get expiry from cert if available
      if (svid.certs && svid.certs[0]) {
        return svid.certs[0].validTo.getTime();
      }
      if (svid.expiry) {
        return new Date(svid.expiry).getTime();
      }
    } catch {
      // fallback: 1 hour
    }
    return Date.now() + 3600_000;
  }
}

module.exports = APortAdapter;
