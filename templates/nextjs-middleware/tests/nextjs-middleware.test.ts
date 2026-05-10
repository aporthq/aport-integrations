import type { NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  createAPortMiddleware,
  extractAgentIdFromNextRequest,
  type APortClientLike,
  type APortNextApiRequest,
  verifyAPortRequest,
  withAPortApiRoute,
  withAPortRouteHandler,
} from "../src/index";

function request(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

function mockClient(
  response: Awaited<ReturnType<APortClientLike["verifyPolicy"]>>,
): APortClientLike {
  return {
    verifyPolicy: vi.fn().mockResolvedValue(response),
  };
}

describe("APort Next.js middleware", () => {
  it("allows verified requests and forwards verification headers", async () => {
    const client = mockClient({
      decision_id: "dec_123",
      allow: true,
      assurance_level: "L2",
    });
    const middleware = createAPortMiddleware("finance.payment.refund.v1", {
      client,
    });

    const response = await middleware(
      request("https://app.example/refund", {
        headers: {
          "x-agent-id": "agt_123",
          "user-agent": "vitest",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-aport-verified")).toBe("true");
    expect(response.headers.get("x-aport-agent-id")).toBe("agt_123");
    expect(response.headers.get("x-aport-decision-id")).toBe("dec_123");
    expect(client.verifyPolicy).toHaveBeenCalledWith(
      "agt_123",
      "finance.payment.refund.v1",
      expect.objectContaining({
        framework: "nextjs",
        method: "GET",
        path: "/refund",
        userAgent: "vitest",
      }),
      undefined,
    );
  });

  it("rejects denied policy decisions", async () => {
    const client = mockClient({
      decision_id: "dec_denied",
      allow: false,
      reasons: [
        {
          code: "LIMIT_EXCEEDED",
          message: "Refund amount exceeds the policy limit",
          severity: "error",
        },
      ],
    });
    const middleware = createAPortMiddleware("finance.payment.refund.v1", {
      client,
    });

    const response = await middleware(
      request("https://app.example/refund?agent_id=agt_denied"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual(
      expect.objectContaining({
        error: "Verification failed",
        message: "Refund amount exceeds the policy limit",
        policy: "finance.payment.refund.v1",
        agentId: "agt_denied",
        decisionId: "dec_denied",
      }),
    );
  });

  it("requires an agent id before calling APort", async () => {
    const client = mockClient({
      decision_id: "dec_unused",
      allow: true,
    });
    const middleware = createAPortMiddleware("admin.access", { client });

    const response = await middleware(request("https://app.example/admin"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Agent ID required");
    expect(client.verifyPolicy).not.toHaveBeenCalled();
  });

  it("can continue on verification errors in non-strict mode", async () => {
    const client: APortClientLike = {
      verifyPolicy: vi.fn().mockRejectedValue(new Error("APort unavailable")),
    };
    const middleware = createAPortMiddleware("admin.access", {
      client,
      strict: false,
    });

    const response = await middleware(
      request("https://app.example/admin", {
        headers: {
          "x-agent-id": "agt_123",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-aport-verified")).toBe("false");
    expect(response.headers.get("x-aport-agent-id")).toBe("agt_123");
  });

  it("extracts agent ids from configured cookies", async () => {
    const agentId = await extractAgentIdFromNextRequest(
      request("https://app.example/protected", {
        headers: {
          cookie: "aport_agent_id=agt_cookie",
        },
      }),
    );

    expect(agentId).toBe("agt_cookie");
  });

  it("supports App Router route handlers", async () => {
    const client = mockClient({
      decision_id: "dec_route",
      allow: true,
    });
    const handler = vi.fn((_req, _ctx, aport) =>
      NextResponse.json({
        agentId: aport.agentId,
        decisionId:
          aport.decision && "decision_id" in aport.decision
            ? aport.decision.decision_id
            : undefined,
      }),
    );
    const route = withAPortRouteHandler("admin.access", handler, { client });

    const response = await route(
      request("https://app.example/api/admin", {
        headers: {
          "x-agent-id": "agt_route",
        },
      }),
      { params: {} },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(body).toEqual({
      agentId: "agt_route",
      decisionId: "dec_route",
    });
  });

  it("supports Pages Router API routes", async () => {
    const client = mockClient({
      decision_id: "dec_pages",
      allow: true,
    });
    const handler = vi.fn((req: APortNextApiRequest, res: NextApiResponse) => {
      res.status(200).json({
        agentId: req.aport?.agentId,
        verified: req.aport?.verified,
      });
    });
    const route = withAPortApiRoute("admin.access", handler, { client });
    const req = {
      method: "GET",
      url: "/api/admin?agent_id=agt_pages",
      headers: {},
      query: {
        agent_id: "agt_pages",
      },
      cookies: {},
      socket: {
        remoteAddress: "127.0.0.1",
      },
    } as unknown as APortNextApiRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as NextApiResponse;

    await route(req, res);

    expect(handler).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      agentId: "agt_pages",
      verified: true,
    });
  });

  it("exposes verifyAPortRequest for custom flows", async () => {
    const result = await verifyAPortRequest(
      "custom.policy",
      request("https://app.example/custom", {
        headers: {
          "x-agent-id": "agt_custom",
          "idempotency-key": "idem_123",
        },
      }),
      {
        client: mockClient({
          decision_id: "dec_custom",
          allow: true,
        }),
        context: {
          action: "custom",
        },
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        allow: true,
        verified: true,
        agentId: "agt_custom",
        policy: "custom.policy",
      }),
    );
  });
});
