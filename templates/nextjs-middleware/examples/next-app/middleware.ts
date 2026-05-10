import { createAPortMiddleware } from "@aporthq/middleware-nextjs";

export default createAPortMiddleware("site.access", {
  strict: process.env.APORT_STRICT !== "false",
});

export const config = {
  matcher: ["/protected/:path*"],
};
