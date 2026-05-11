import { NextResponse, type NextRequest } from "next/server";
import { createAPortMiddleware } from "@aporthq/nextjs-middleware";

const verifyAgent = createAPortMiddleware({
  policyPack: "finance.payment.refund.v1",
  agentIdHeader: "x-agent-id",
  apiKey: process.env.APORT_API_KEY
});

export async function middleware(request: NextRequest) {
  const verification = await verifyAgent(request);

  if (!verification.allowed) {
    return NextResponse.json(
      { error: verification.reason ?? "APort verification failed" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/refunds/:path*"]
};
