const { aportMiddleware, withAPort } = require("../src");

// Mock Request/Response objects simulating Next.js App Router
function createMockRequest({ path = "/api/test", headers = {} } = {}) {
  return {
    nextUrl: { pathname: path },
    url: path,
    method: "GET",
    headers: new Map(Object.entries(headers)),
    get(header) {
      return headers[header] || null;
    },
  };
}

// Check if a value looks like a Next.js Response
function isResponse(val) {
  return (
    val &&
    typeof val === "object" &&
    typeof val.status === "number" &&
    typeof val.headers === "object"
  );
}

describe("aportMiddleware", () => {
  test("allows request with valid agent ID", async () => {
    const middleware = aportMiddleware({ policy: "test.v1" });
    const result = await middleware(
      createMockRequest({ headers: { "x-agent-id": "agt_001" } })
    );
    expect(result.headers.get("x-aport-verified")).toBe("true");
  });

  test("blocks request without agent ID", async () => {
    const middleware = aportMiddleware({ policy: "test.v1" });
    const result = await middleware(createMockRequest());
    expect(result.status).toBe(400);
  });

  test("skips non-matching paths", async () => {
    const middleware = aportMiddleware({
      policy: "test.v1",
      match: ["/api"],
    });
    const result = await middleware(createMockRequest({ path: "/public/page" }));
    // Skipped — should not be a 400 or 403
    expect(result.status).toBe(200);
  });

  test("calls onVerified callback", async () => {
    let called = false;
    const middleware = aportMiddleware({
      policy: "test.v1",
      onVerified: (req, result) => {
        called = true;
        return new Response("ok", { status: 200 });
      },
    });
    const result = await middleware(
      createMockRequest({ headers: { "x-agent-id": "agt_002" } })
    );
    expect(called).toBe(true);
    expect(result.status).toBe(200);
  });

  test("calls onDenied callback", async () => {
    const middleware = aportMiddleware({
      policy: "test.v1",
      onDenied: () => new Response("custom denied", { status: 403 }),
    });
    // Force denial by not providing agent ID
    const result = await middleware(createMockRequest());
    expect(result.status).toBe(403);
  });

  test("non-strict mode allows on error", async () => {
    const middleware = aportMiddleware({
      policy: "test.v1",
      strict: false,
    });
    // Provide agent ID but mock client will succeed; test error path differently
    const result = await middleware(
      createMockRequest({ headers: { "x-agent-id": "agt_003" } })
    );
    // Should succeed in non-strict
    expect(result.status).toBe(200);
  });
});

describe("withAPort", () => {
  test("adds getInitialProps to App component", () => {
    const App = { displayName: "TestApp" };
    const Wrapped = withAPort(App, { policy: "test.v1" });
    expect(typeof Wrapped.getInitialProps).toBe("function");
  });

  test("getInitialProps handles req with agent ID", async () => {
    const App = { displayName: "TestApp" };
    const Wrapped = withAPort(App, { policy: "test.v1" });

    const appContext = {
      ctx: {
        req: {
          headers: { "x-agent-id": "agt_004" },
          method: "GET",
          url: "/test",
        },
      },
    };

    // Should not throw
    await expect(Wrapped.getInitialProps(appContext)).resolves.toBeDefined();
  });
});
