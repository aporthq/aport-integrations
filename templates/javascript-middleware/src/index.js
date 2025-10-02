/**
 * Mock APort Client for template demonstration
 * In production, replace with: const { APortClient } = require("@aporthq/sdk-node");
 */
class MockAPortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl = options.baseUrl || process.env.APORT_BASE_URL || "https://api.aport.io";
  }

  async verify(policy, agentId, options = {}) {
    // Mock verification - always returns success for template
    console.log(`[MOCK] Verifying agent ${agentId} against policy ${policy}`);
    return {
      verified: true,
      passport: {
        agentId: agentId,
        capabilities: ["read", "write"],
        limits: { requests: 1000, period: "1h" }
      },
      policy: policy,
      message: "Mock verification successful"
    };
  }
}

/**
 * APort middleware for Express.js applications
 * @param {Object} options - Configuration options
 * @param {string} options.apiKey - APort API key
 * @param {string} options.baseUrl - APort API base URL
 * @param {Object} options.defaults - Default verification options
 * @returns {Function} Express middleware function
 */
function createAPortMiddleware(options = {}) {
  const client = new MockAPortClient({
    apiKey: options.apiKey || process.env.APORT_API_KEY,
    baseUrl:
      options.baseUrl || process.env.APORT_BASE_URL || "https://api.aport.io",
  });

  /**
   * Express middleware function
   * @param {string} policy - Policy pack identifier
   * @param {Object} middlewareOptions - Middleware-specific options
   * @returns {Function} Express middleware
   */
  return function requirePolicy(policy, middlewareOptions = {}) {
    return async (req, res, next) => {
      try {
        // Extract agent ID from request
        const agentId = extractAgentId(req, middlewareOptions);

        if (!agentId) {
          return res.status(400).json({
            error: "Agent ID required",
            message: "Agent ID must be provided in headers, query, or body",
          });
        }

        // Verify agent against policy
        const result = await client.verify(policy, agentId, {
          context: {
            method: req.method,
            path: req.path,
            userAgent: req.get("User-Agent"),
            ip: req.ip,
            ...middlewareOptions.context,
          },
        });

        if (!result.verified) {
          return res.status(403).json({
            error: "Verification failed",
            message: result.message || "Agent verification failed",
            details: result.details,
          });
        }

        // Attach verification result to request
        req.aport = {
          verified: true,
          passport: result.passport,
          policy: policy,
          agentId: agentId,
          result: result,
        };

        next();
      } catch (error) {
        console.error("APort verification error:", error);

        if (middlewareOptions.strict !== false) {
          return res.status(500).json({
            error: "Verification error",
            message: "Internal verification error",
          });
        }

        // In non-strict mode, continue without verification
        req.aport = {
          verified: false,
          error: error.message,
        };

        next();
      }
    };
  };
}

/**
 * Extract agent ID from request
 * @param {Object} req - Express request object
 * @param {Object} options - Extraction options
 * @returns {string|null} Agent ID or null
 */
function extractAgentId(req, options = {}) {
  // Check various sources for agent ID
  const sources = [
    () => req.headers["x-agent-id"],
    () => req.headers["x-aport-agent-id"],
    () => req.query.agent_id,
    () => req.body.agent_id,
    () => req.body.agentId,
    () => options.agentId, // Static agent ID
  ];

  for (const source of sources) {
    const agentId = source();
    if (agentId && typeof agentId === "string") {
      return agentId;
    }
  }

  return null;
}

/**
 * Create a policy checker function
 * @param {string} policy - Policy pack identifier
 * @param {Object} options - Checker options
 * @returns {Function} Policy checker function
 */
function createPolicyChecker(policy, options = {}) {
  const middleware = createAPortMiddleware(options);
  return middleware(policy, options);
}

module.exports = {
  createAPortMiddleware,
  createPolicyChecker,
  extractAgentId,
};
