// APort Next.js Middleware — App Router Example
//
// Save this file as `middleware.ts` in your Next.js project root:
//
//   import { aportMiddleware } from "aport-nextjs-middleware";
//   import { NextResponse } from "next/server";
//
//   export const config = { matcher: ["/api/:path*"] };
//
//   export default aportMiddleware({
//     policy: "agent.basic.v1",
//     onVerified: (request, result) => {
//       const response = NextResponse.next();
//       response.headers.set("x-aport-verified", "true");
//       response.headers.set("x-aport-agent-id", request.headers.get("x-agent-id") || "");
//       return response;
//     },
//     onDenied: (request, error) => {
//       return NextResponse.json({ error: error.message || "Access denied" }, { status: 403 });
//     },
//   });

const { aportMiddleware } = require("../src");

// Example using the middleware directly (for testing outside Next.js)
const middleware = aportMiddleware({
  policy: "example.v1",
  match: ["/api"],
});

// Simulate Next.js request
async function demo() {
  const mockRequest = {
    nextUrl: { pathname: "/api/users" },
    url: "/api/users",
    method: "GET",
    headers: {
      get: (name) => {
        const headers = { "x-agent-id": "agt_demo_001", "user-agent": "test" };
        return headers[name] || null;
      },
    },
  };

  const response = await middleware(mockRequest);
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers.entries()));
}

demo().catch(console.error);
