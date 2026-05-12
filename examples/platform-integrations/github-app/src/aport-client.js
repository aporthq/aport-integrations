class APortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl =
      options.baseUrl || process.env.APORT_BASE_URL || "https://aport.io";
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async verifyPolicy(policyPack, agentId, context = {}) {
    if (!this.apiKey) {
      throw new Error("APORT_API_KEY is required for policy verification");
    }
    if (!agentId) {
      throw new Error("APORT_AGENT_ID is required for policy verification");
    }

    const response = await this.fetchImpl(
      `${this.baseUrl}/api/verify/policy/${encodeURIComponent(policyPack)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: {
            agent_id: agentId,
            policy_id: policyPack,
            context,
          },
        }),
      }
    );

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message = body.message || body.error || response.statusText;
      throw new Error(`APort API error (${response.status}): ${message}`);
    }

    return {
      verified: Boolean(body.verified || body.allowed || body.success),
      message: body.message || body.reason || "",
      raw: body,
    };
  }
}

module.exports = { APortClient };
