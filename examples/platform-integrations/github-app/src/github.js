const crypto = require("crypto");
const axios = require("axios");

/**
 * GitHub API Helper for the APort GitHub App.
 * Handles webhook signature verification, JWT generation,
 * installation access tokens, and commit status creation.
 */
class GitHubHelper {
  constructor(options = {}) {
    this.appId = options.appId || process.env.GITHUB_APP_ID;
    this.privateKey = options.privateKey || process.env.GITHUB_PRIVATE_KEY;
    this.webhookSecret =
      options.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;

    if (this.privateKey && this.privateKey.includes("\\n")) {
      this.privateKey = this.privateKey.replace(/\\n/g, "\n");
    }
  }

  /**
   * Verify the GitHub webhook payload signature.
   * @param {string} payload - Raw request body string
   * @param {string} signature - X-Hub-Signature-256 header value
   * @returns {boolean} Whether the signature is valid
   */
  verifySignature(payload, signature) {
    if (!this.webhookSecret) {
      // Warn but allow if no secret configured (development mode)
      console.warn(
        "GITHUB_WEBHOOK_SECRET not configured — skipping signature verification"
      );
      return true;
    }

    if (!signature) {
      return false;
    }

    const expectedSignature = `sha256=${crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload, "utf8")
      .digest("hex")}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a JWT for GitHub App authentication.
   * @returns {string} Signed JWT
   */
  generateJWT() {
    if (!this.appId || !this.privateKey) {
      throw new Error(
        "GITHUB_APP_ID and GITHUB_PRIVATE_KEY are required for JWT generation"
      );
    }

    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued 60s ago for clock skew tolerance
      exp: now + 600, // Expires in 10 minutes (max allowed)
      iss: this.appId,
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString(
      "base64url"
    );
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );
    const signInput = `${b64Header}.${b64Payload}`;

    const signature = crypto
      .createSign("RSA-SHA256")
      .update(signInput)
      .sign(this.privateKey, "base64url");

    return `${signInput}.${signature}`;
  }

  /**
   * Get an installation access token for a specific installation.
   * @param {string} installationId - GitHub installation ID
   * @returns {Promise<string>} Installation access token
   */
  async getInstallationToken(installationId) {
    const jwt = this.generateJWT();

    try {
      const response = await axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      return response.data.token;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `GitHub API Error: ${error.response.data.message || error.response.statusText}`
        );
      }
      throw new Error(`GitHub Network Error: ${error.message}`);
    }
  }

  /**
   * Create a commit status on a PR head SHA.
   * @param {Object} params - Status parameters
   * @param {string} params.token - Installation access token
   * @param {string} params.owner - Repository owner
   * @param {string} params.repo - Repository name
   * @param {string} params.sha - Commit SHA
   * @param {string} params.state - Status state (success, failure, pending, error)
   * @param {string} params.description - Status description
   * @param {string} params.targetUrl - Target URL for "Details" link
   * @param {string} params.context - Status context name (e.g. "APort/PR-Verify")
   * @returns {Promise<Object>} Created status response
   */
  async createCommitStatus({
    token,
    owner,
    repo,
    sha,
    state,
    description,
    targetUrl = "https://aport.io",
    context = "APort/PR-Verify",
  }) {
    if (!sha) {
      throw new Error("Commit SHA is required for status creation");
    }

    const validStates = ["success", "failure", "pending", "error"];
    if (!validStates.includes(state)) {
      throw new Error(
        `Invalid state: ${state}. Must be one of: ${validStates.join(", ")}`
      );
    }

    try {
      const response = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
        {
          state,
          description: description.substring(0, 140), // GitHub limits to 140 chars
          target_url: targetUrl,
          context,
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `GitHub API Error: ${error.response.data.message || error.response.statusText}`
        );
      }
      throw new Error(`GitHub Network Error: ${error.message}`);
    }
  }

  /**
   * Extract relevant PR context from a webhook payload for APort verification.
   * @param {Object} payload - GitHub webhook payload
   * @returns {Object} Context object for APort verify call
   */
  buildVerifyContext(payload) {
    const pr = payload.pull_request || {};
    const repo = payload.repository || {};

    return {
      action: payload.action,
      repository: repo.full_name,
      pr_number: pr.number,
      base_branch: pr.base?.ref,
      head_branch: pr.head?.ref,
      title: pr.title,
      user: pr.user?.login || payload.sender?.login,
      changed_files: pr.changed_files,
      additions: pr.additions,
      deletions: pr.deletions,
      merged: pr.merged || false,
      draft: pr.draft || false,
    };
  }
}

module.exports = GitHubHelper;
