const axios = require("axios");

class APortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl =
      options.baseUrl || process.env.APORT_BASE_URL || "https://aport.io";

    // Only require API key for endpoints that need authentication
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
   * Verify an agent against a policy
   * @param {string} policy - Policy pack identifier
   * @param {string} agentId - Agent identifier
   * @param {Object} context - Additional context for verification
   * @returns {Promise<Object>} Verification result
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
          `API Error: ${
            error.response.data.message || error.response.statusText
          }`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * Verify an agent against a specific policy pack
   * @param {string} policy - Policy pack identifier
   * @param {string} agentId - Agent identifier
   * @param {Object} context - Additional context for verification
   * @returns {Promise<Object>} Policy verification result
   */
  async verifyPolicy(policy, agentId, context = {}) {
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
          `API Error: ${
            error.response.data.message || error.response.statusText
          }`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * Create a new agent passport
   * @param {Object} passportData - Passport data
   * @returns {Promise<Object>} Created passport
   */
  async createPassport(passportData) {
    if (!this.apiKey) {
      throw new Error(
        "API key required for passport creation. Set APORT_API_KEY environment variable or use --api-key option."
      );
    }

    try {
      const response = await this.client.post("/api/issue", passportData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `API Error: ${
            error.response.data.message || error.response.statusText
          }`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * Get passport information for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object>} Passport data
   */
  async getPassport(agentId) {
    // Try verification endpoint first (works without API key and returns passport)
    try {
      const response = await this.client.get(`/api/verify/${agentId}`, {
        params: {
          policy_pack: "code.repository.merge.v1", // Use a basic policy for passport retrieval
          context: JSON.stringify({}),
        },
      });

      if (response.data && response.data.agent_id) {
        return response.data;
      }
    } catch (error) {
      // If verification fails, try the dedicated passport endpoint (requires API key)
      if (!this.apiKey) {
        throw new Error(
          "API key required for passport retrieval. Set APORT_API_KEY environment variable or use --api-key option."
        );
      }

      try {
        const response = await this.client.get(`/api/passports/${agentId}`);
        return response.data;
      } catch (passportError) {
        if (passportError.response) {
          throw new Error(
            `API Error: ${
              passportError.response.data.message ||
              passportError.response.statusText
            }`
          );
        }
        throw new Error(`Network Error: ${passportError.message}`);
      }
    }

    throw new Error("Unable to retrieve passport information");
  }

  /**
   * Suspend an agent passport
   * @param {string} agentId - Agent identifier
   * @param {string} reason - Suspension reason
   * @returns {Promise<Object>} Suspension result
   */
  async suspendPassport(agentId, reason = "Suspended via CLI") {
    try {
      const response = await this.client.post(`/api/suspend`, {
        agent_id: agentId,
        reason: reason,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `API Error: ${
            error.response.data.message || error.response.statusText
          }`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * Get policy pack information
   * @param {string} policyId - Policy pack identifier
   * @returns {Promise<Object>} Policy pack data
   */
  async getPolicyPack(policyId) {
    try {
      const response = await this.client.get(`/api/policies/${policyId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `API Error: ${
            error.response.data.message || error.response.statusText
          }`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * List all available policy packs
   * @returns {Promise<Array>} List of policy packs
   */
  async listPolicyPacks() {
    try {
      const response = await this.client.get("/api/policies");
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `API Error: ${
            error.response.data.message || error.response.statusText
          }`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }
}

module.exports = APortClient;
