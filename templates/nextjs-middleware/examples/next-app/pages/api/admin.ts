import type { NextApiResponse } from "next";
import {
  type APortNextApiRequest,
  withAPortApiRoute,
} from "@aporthq/middleware-nextjs";

export default withAPortApiRoute(
  "admin.access",
  async (req: APortNextApiRequest, res: NextApiResponse) => {
    res.status(200).json({
      success: true,
      agentId: req.aport?.agentId,
      verified: req.aport?.verified,
      decision:
        req.aport?.decision && "decision_id" in req.aport.decision
          ? req.aport.decision.decision_id
          : null,
    });
  },
  {
    strict: process.env.APORT_STRICT !== "false",
  },
);
