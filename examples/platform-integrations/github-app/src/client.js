const axios = require("axios");

/**
 * APort API Client for GitHub App
 * Handles all communication with the APort verification service.
 */
class APortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl =
      options.baseUrl || process.env.APORT_BASE_URL || "https://aport.io";

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * Verify an agent against a policy pack.
   * @param {string} policy - Policy pack identifier (e.g. "code.repository.merge.v1")
   * @param {string} agentId - Agent identifier
   * @param {Object} context - Additional verification context
   * @returns {Promise<Object>} Verification result with decision details
   */
  async verify(policy, agentId, context = {}) {
    try {
      const response = await this.client.post(`/api/verify/policy/${policy}`, {
        context: {
          agent_id: agentId,
          policy_id: policy,
          context: context,
        },
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `API Error: ${error.response.data.message || error.response.statusText}`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * Get passport information for an agent.
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object>} Passport data
   */
  async getPassport(agentId) {
    try {
      const response = await this.client.get(`/api/verify/${agentId}`, {
        params: {
          policy_pack: "code.repository.merge.v1",
          context: JSON.stringify({}),
        },
      });

      if (response.data && response.data.agent_id) {
        return response.data;
      }
    } catch (error) {
      if (!this.apiKey) {
        throw new Error("API key required for passport retrieval.");
      }

      try {
        const response = await this.client.get(`/api/passports/${agentId}`);
        return response.data;
      } catch (passportError) {
        if (passportError.response) {
          throw new Error(
            `API Error: ${passportError.response.data.message || passportError.response.statusText}`
          );
        }
        throw new Error(`Network Error: ${passportError.message}`);
      }
    }

    throw new Error("Unable to retrieve passport information");
  }

  /**
   * List all available policy packs.
   * @returns {Promise<Array>} List of policy packs
   */
  async listPolicies() {
    try {
      const response = await this.client.get("/api/policies");
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `API Error: ${error.response.data.message || error.response.statusText}`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }
}

module.exports = APortClient;
