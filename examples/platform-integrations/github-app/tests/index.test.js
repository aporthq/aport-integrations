const { createServer, validateEnv } = require("../src/index");

// Mock helper to avoid actual HTTP server in unit tests
let mockHandlePullRequest;

// --- Mock dependencies ---
jest.mock("../src/github", () => {
  const original = jest.requireActual("../src/github");
  return jest.fn().mockImplementation((options) => {
    const instance = new original(options);
    // We mock specific methods in each test
    return instance;
  });
});

jest.mock("../src/client", () => {
  return jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
    getPassport: jest.fn(),
    listPolicies: jest.fn(),
  }));
});

// --- Server Tests ---
describe("Server", () => {
  test("createServer should return an http.Server instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe("function");
    expect(typeof server.close).toBe("function");
    server.close();
  });

  test("GET /health should return 200 with status ok", (done) => {
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      const http = require("http");
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          expect(res.statusCode).toBe(200);
          const body = JSON.parse(data);
          expect(body.status).toBe("ok");
          expect(body.app).toBe("aport-github-app");
          server.close();
          done();
        });
      });
    });
  });

  test("GET non-health endpoint should return 405", (done) => {
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      const http = require("http");
      const req = http.request(
        { hostname: "localhost", port, path: "/other", method: "GET" },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            expect(res.statusCode).toBe(405);
            server.close();
            done();
          });
        }
      );
      req.end();
    });
  });

  test("POST without signature should return 401 when secret is configured", (done) => {
    process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      const http = require("http");
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            expect(res.statusCode).toBe(401);
            server.close();
            delete process.env.GITHUB_WEBHOOK_SECRET;
            done();
          });
        }
      );
      req.write(JSON.stringify({ action: "opened" }));
      req.end();
    });
  });

  test("POST with valid signature should process webhook", (done) => {
    const crypto = require("crypto");
    const secret = "my-secret";
    process.env.GITHUB_WEBHOOK_SECRET = secret;

    const payload = JSON.stringify({
      action: "opened",
      pull_request: {
        number: 1,
        head: { sha: "abc123", ref: "feature" },
        base: { ref: "main" },
        title: "Test PR",
        user: { login: "test-user" },
      },
      repository: {
        full_name: "test/repo",
        name: "repo",
        owner: { login: "test" },
      },
      installation: { id: 12345 },
    });

    const signature =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      const http = require("http");
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
            "x-hub-signature-256": signature,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            // Will fail because we don't have a real GitHub token, but should get past signature check
            // Status code depends on APort/GitHub API, either 502 or 500
            expect([200, 400, 500, 502]).toContain(res.statusCode);
            server.close();
            delete process.env.GITHUB_WEBHOOK_SECRET;
            done();
          });
        }
      );
      req.write(payload);
      req.end();
    });
  });

  test("POST with invalid JSON should return 400", (done) => {
    delete process.env.GITHUB_WEBHOOK_SECRET; // No secret = no signature check
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      const http = require("http");
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "pull_request",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            expect(res.statusCode).toBe(400);
            server.close();
            done();
          });
        }
      );
      req.write("not-json");
      req.end();
    });
  });

  test("POST with unhandled event should return 200", (done) => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      const http = require("http");
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-github-event": "push",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(data);
            expect(body.message).toContain("ignored");
            server.close();
            done();
          });
        }
      );
      req.write(JSON.stringify({}));
      req.end();
    });
  });
});

// --- Environment Validation ---
describe("validateEnv", () => {
  beforeEach(() => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_PRIVATE_KEY;
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.APORT_API_KEY;
  });

  test("should return false when required vars are missing", () => {
    const result = validateEnv();
    expect(result).toBe(false);
  });

  test("should return true when required vars are present", () => {
    process.env.GITHUB_APP_ID = "12345";
    process.env.GITHUB_PRIVATE_KEY = "key";
    const result = validateEnv();
    expect(result).toBe(true);
  });
});
