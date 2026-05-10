import { withAPortRouteHandler } from "@aporthq/middleware-nextjs";

export const POST = withAPortRouteHandler(
  "finance.payment.refund.v1",
  async (request, _context, aport) => {
    const body = await request.json().catch(() => ({}));

    return Response.json({
      success: true,
      agentId: aport.agentId,
      decisionId:
        aport.decision && "decision_id" in aport.decision
          ? aport.decision.decision_id
          : undefined,
      refund: {
        amount: body.amount ?? null,
        currency: body.currency ?? "USD",
      },
    });
  },
  {
    strict: process.env.APORT_STRICT !== "false",
  },
);
