class AportAdapter {
  constructor(aportBaseUrl, apiKey) {
    this.baseUrl = aportBaseUrl;
    this.apiKey = apiKey;
  }

  spiffeToPassport(svid) {
    return {
      agent_id: svid.spiffeId,
      identity_type: 'spiffe',
      trust_domain: svid.trustDomain,
      workload_id: svid.workloadId,
      assurance_level: 'spiffe_x509',
      capabilities: ['workload_identity', 'mtls'],
      issued_at: new Date().toISOString(),
    };
  }

  async verifyWithAPort(passport, policyId, context = {}) {
    const resp = await fetch(`${this.baseUrl}/api/verify/policy/${policyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ context, passport }),
    });
    return resp.json();
  }
}
module.exports = AportAdapter;
