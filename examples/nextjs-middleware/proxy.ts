import { NextResponse, type NextRequest } from "next/server";

type VerifyResponse = {
  allow?: boolean;
  reasons?: string[];
};

const DEFAULT_APORT_API_BASE_URL = "https://api.aport.io";

function jsonError(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

function getAgentId(request: NextRequest) {
  return (
    request.headers.get("x-agent-id") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null
  );
}

export async function proxy(request: NextRequest) {
  const apiKey = process.env.APORT_API_KEY;
  const policyId = process.env.APORT_POLICY_ID;
  const apiBaseUrl =
    process.env.APORT_API_BASE_URL ?? DEFAULT_APORT_API_BASE_URL;

  if (!apiKey || !policyId) {
    return jsonError("APort middleware is not configured.", 503);
  }

  const agentId = getAgentId(request);

  if (!agentId) {
    return jsonError("Missing agent identity. Send an x-agent-id header.");
  }

  try {
    const verifyResponse = await fetch(new URL("/verify", apiBaseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        policy_id: policyId,
        context: {
          method: request.method,
          pathname: request.nextUrl.pathname,
        },
      }),
    });

    if (!verifyResponse.ok) {
      return jsonError("APort verification failed. Try again later.", 502);
    }

    const decision = (await verifyResponse.json()) as VerifyResponse;

    if (!decision.allow) {
      const reason = decision.reasons?.[0] ?? "Policy denied this request.";
      return jsonError(reason);
    }

    return NextResponse.next();
  } catch {
    return jsonError("APort verification is unavailable. Try again later.", 502);
  }
}

export const config = {
  matcher: ["/protected/:path*"],
};
