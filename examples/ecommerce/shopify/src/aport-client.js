class APortClient {
  constructor({ baseUrl, apiKey, fetchImpl } = {}) {
    this.baseUrl = (baseUrl || process.env.APORT_BASE_URL || "https://aport.io").replace(/\/$/, "");
    this.apiKey = apiKey || process.env.APORT_API_KEY;
    this.fetch = fetchImpl || globalThis.fetch;

    if (!this.fetch) {
      throw new Error("A fetch implementation is required.");
    }
  }

  async verify(policy, agentId, context = {}) {
    if (!policy) {
      throw new Error("APort policy is required.");
    }

    if (!agentId) {
      throw new Error("APort agent ID is required.");
    }

    const response = await this.fetch(`${this.baseUrl}/api/verify/policy/${encodeURIComponent(policy)}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        policy_id: policy,
        agent_id: agentId,
        context,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `APort verification failed with HTTP ${response.status}`);
    }

    return {
      verified: Boolean(payload.verified || payload.success),
      passport: payload.passport || null,
      message: payload.message || null,
      details: payload.details || {},
      raw: payload,
    };
  }

  headers() {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "aport-shopify-refund-guardrail/1.0",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

module.exports = {
  APortClient,
};
