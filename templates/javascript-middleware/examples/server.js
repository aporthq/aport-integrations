const express = require("express");
const { createAPortMiddleware } = require("../src");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize APort middleware
const aportMiddleware = createAPortMiddleware({
  apiKey: process.env.APORT_API_KEY,
  baseUrl: process.env.APORT_BASE_URL,
});

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "APort Express Middleware Example",
    version: "1.0.0",
    endpoints: {
      "GET /public": "Public endpoint (no verification)",
      "POST /refund":
        "Refund endpoint (requires finance.payment.refund.v1 policy)",
      "GET /admin": "Admin endpoint (requires admin.access policy)",
    },
  });
});

// Public endpoint (no verification required)
app.get("/public", (req, res) => {
  res.json({
    message: "This is a public endpoint",
    timestamp: new Date().toISOString(),
  });
});

// Refund endpoint (requires verification)
app.post(
  "/refund",
  aportMiddleware("finance.payment.refund.v1", {
    context: {
      endpoint: "refund",
      action: "process_refund",
    },
  }),
  (req, res) => {
    const { amount, order_id } = req.body;

    // Access verification result
    const { passport, agentId } = req.aport;

    // Check specific limits
    if (amount > passport.limits.refund_amount_max_per_tx) {
      return res.status(403).json({
        error: "Refund amount exceeds limit",
        requested: amount,
        limit: passport.limits.refund_amount_max_per_tx,
      });
    }

    // Process refund
    res.json({
      success: true,
      message: "Refund processed successfully",
      refund: {
        id: `refund_${Date.now()}`,
        amount: amount,
        order_id: order_id,
        agent_id: agentId,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// Admin endpoint (requires admin access)
app.get(
  "/admin",
  aportMiddleware("admin.access", {
    context: {
      endpoint: "admin",
      action: "view_dashboard",
    },
  }),
  (req, res) => {
    const { passport } = req.aport;

    res.json({
      message: "Admin dashboard",
      user: {
        agent_id: req.aport.agentId,
        capabilities: passport.capabilities,
        limits: passport.limits,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}`);
  console.log(`🔑 Make sure to set APORT_API_KEY environment variable`);
});
