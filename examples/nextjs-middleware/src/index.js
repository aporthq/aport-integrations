/**
 * APort Next.js Middleware
 *
 * Provides APort verification for both App Router and Pages Router.
 *
 * ## App Router (middleware.ts)
 * ```ts
 * import { aportMiddleware } from "aport-nextjs-middleware";
 * import { NextResponse } from "next/server";
 *
 * export const config = { matcher: ["/api/:path*"] };
 *
 * export default aportMiddleware({
 *   policy: "agent.basic.v1",
 *   onDenied: () => NextResponse.json({ error: "Denied" }, { status: 403 }),
 * });
 * ```
 *
 * ## Pages Router (_app.tsx)
 * ```ts
 * import { withAPort } from "aport-nextjs-middleware";
 * import type { AppContext, AppProps } from "next/app";
 *
 * export default withAPort(MyApp, { policy: "agent.basic.v1" });
 * ```
 */

/**
 * Mock APort Client
 * In production, replace with: const { verify } = require("@aporthq/sdk-node");
 */
class MockAPortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl = options.baseUrl || process.env.APORT_BASE_URL || "https://api.aport.io";
  }

  async verify(policy, agentId, context = {}) {
    console.log(`[APort] Verifying agent ${agentId} against policy ${policy}`);
    return {
      verified: true,
      passport: {
        agentId,
        capabilities: ["read", "write"],
        limits: { requests: 1000, period: "1h" },
      },
      policy,
      message: "Mock verification successful",
    };
  }
}

/**
 * Create an APort Next.js middleware for App Router.
 *
 * @param {Object} options
 * @param {string} options.policy - Policy pack identifier
 * @param {string} [options.apiKey] - API key (falls back to APORT_API_KEY env)
 * @param {string} [options.baseUrl] - API base URL
 * @param {Function} [options.onVerified] - Called on success; receives (request, result)
 * @param {Function} [options.onDenied] - Called on failure; must return a Response
 * @param {Function} [options.onError] - Called on error; must return a Response
 * @param {boolean} [options.strict=true] - Block on errors when true
 * @param {string[]} [options.match] - Path prefixes to protect (default ["/api"])
 * @returns {Function} Next.js middleware function
 */
function aportMiddleware(options = {}) {
  const {
    policy = "default.v1",
    apiKey,
    baseUrl,
    onVerified,
    onDenied,
    onError,
    strict = true,
    match = ["/api"],
  } = options;

  const client = new MockAPortClient({ apiKey, baseUrl });

  // Return a middleware compatible with Next.js App Router
  async function middleware(request) {
    // Check if path matches
    const pathname = request.nextUrl?.pathname || request.url || "";
    const shouldProtect = match.some(
      (prefix) => typeof pathname === "string" && pathname.startsWith(prefix)
    );

    if (!shouldProtect) {
      return onVerified
        ? onVerified(request, { verified: true, skipped: true })
        : new Response(null, { status: 200 });
    }

    const agentId =
      request.headers.get("x-agent-id") ||
      request.headers.get("x-aport-agent-id");

    if (!agentId) {
      return onDenied
        ? onDenied(request, { error: "Agent ID required" })
        : new Response(JSON.stringify({ error: "Agent ID required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
    }

    try {
      const context = {
        method: request.method,
        path: pathname,
        userAgent: request.headers.get("user-agent"),
      };

      const result = await client.verify(policy, agentId, context);

      if (!result.verified) {
        if (onDenied) return onDenied(request, result);
        return new Response(JSON.stringify({ error: "Verification failed" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (onVerified) return onVerified(request, result);

      // Default: pass through with header
      const response = new Response(null, { status: 200 });
      response.headers.set("x-aport-verified", "true");
      response.headers.set("x-aport-agent-id", agentId);
      return response;
    } catch (error) {
      if (onError) return onError(request, error);

      if (strict) {
        return new Response(
          JSON.stringify({ error: "Internal verification error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Non-strict: allow through
      const response = new Response(null, { status: 200 });
      response.headers.set("x-aport-verified", "false");
      return response;
    }
  }

  return middleware;
}

/**
 * HOC for Pages Router — wraps getInitialProps with APort verification.
 *
 * @param {Object} App - Next.js App component
 * @param {Object} options - Same options as aportMiddleware (except onVerified/onDenied)
 * @returns {Object} Wrapped App component
 */
function withAPort(App, options = {}) {
  const { policy = "default.v1", strict = true } = options;
  const client = new MockAPortClient(options);

  App.getInitialProps = App.getInitialProps || async function (appContext) {
    const { req } = appContext.ctx;

    if (req) {
      const agentId =
        req.headers["x-agent-id"] || req.headers["x-aport-agent-id"];

      if (agentId) {
        try {
          const result = await client.verify(policy, agentId, {
            method: req.method,
            path: req.url,
          });
          appContext.ctx.aport = result;
        } catch (error) {
          if (strict) {
            throw new Error("APort verification failed");
          }
          appContext.ctx.aport = { verified: false, error: error.message };
        }
      }
    }

    return {};
  };

  return App;
}

module.exports = {
  aportMiddleware,
  withAPort,
  MockAPortClient,
};
