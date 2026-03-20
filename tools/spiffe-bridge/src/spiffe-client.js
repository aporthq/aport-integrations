'use strict';

const { X509SVID } = require('@spiffe/spiffe-node');
const config = require('./config');

/**
 * SPIFFE Client — connects to Workload API and fetches SVIDs.
 */
class SpiffeClient {
  constructor(opts = {}) {
    this.socketPath = opts.socketPath || config.workloadApiSocket;
    this._svid = null;
    this._bundle = null;
    this._watcher = null;
  }

  /**
   * Fetch the current X.509-SVID from the Workload API.
   * @returns {Promise<{svid: X509SVID, bundle: X509Bundle}>}
   */
  async fetchSVID() {
    try {
      const { X509SVID } = require('@spiffe/spiffe-node');
      const endpoint = require('@spiffe/spiffe-node').default.workload;

      const workload = new endpoint.DefaultWorkloadApiClient(this.socketPath);
      const resp = await workload.fetchX509SVID();

      if (resp.svids && resp.svids.length > 0) {
        this._svid = resp.svids[0];
        this._bundle = resp.bundle;
        return { svid: this._svid, bundle: this._bundle };
      }

      throw new Error('No SVID returned from Workload API');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `Workload API socket not found at ${this.socketPath}. ` +
          'Ensure SPIRE agent is running and the socket path is correct.'
        );
      }
      throw err;
    }
  }

  /**
   * Parse the SPIFFE ID from an SVID.
   * @param {object} svid
   * @returns {{trustDomain: string, path: string, fullId: string}}
   */
  parseSpiffeId(svid) {
    const spiffeId = svid.spiffeId || (svid.id && svid.id.toString()) || '';
    const match = spiffeId.match(/^spiffe:\/\/([^/]+)(\/.*)?$/);
    if (!match) {
      throw new Error(`Invalid SPIFFE ID: ${spiffeId}`);
    }
    return {
      trustDomain: match[1],
      path: match[2] || '',
      fullId: spiffeId,
    };
  }

  /**
   * Watch for SVID updates (automatic rotation).
   * @param {function} onUpdate callback(svid, bundle)
   */
  watchSVID(onUpdate) {
    // In production, use the streaming WatchX509SVID API.
    // For simplicity we poll here.
    this._watcher = setInterval(async () => {
      try {
        const { svid, bundle } = await this.fetchSVID();
        onUpdate(svid, bundle);
      } catch {
        // silently retry on next tick
      }
    }, config.svidRefreshMs);

    return this._watcher;
  }

  /** Stop watching */
  stopWatch() {
    if (this._watcher) {
      clearInterval(this._watcher);
      this._watcher = null;
    }
  }

  get svid() { return this._svid; }
  get bundle() { return this._bundle; }
}

module.exports = SpiffeClient;
