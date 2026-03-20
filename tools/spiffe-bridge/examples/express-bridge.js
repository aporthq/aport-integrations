/**
 * Express + SPIFFE-APort Bridge Example
 *
 * Prerequisites:
 *   - SPIRE agent running with Workload API socket
 *   - APort instance configured
 *   - mTLS termination or X-SPIFFE-ID header from reverse proxy
 */

const express = require('express');
const { spiffeMiddleware } = require('../src/middleware');

const app = express();
app.use(express.json());

// Attach SPIFFE-APort middleware
app.use(spiffeMiddleware({
  // skipAportVerify: true,  // set true to skip APort verification during dev
}));

// Protected route — requires SPIFFE identity
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Authenticated via SPIFFE',
    spiffeId: req.spiffeId.fullId,
    agent: req.passport.agentId,
    roles: req.passport.roles,
  });
});

// Admin route — requires admin policy
app.get('/api/admin', (req, res) => {
  if (!req.passport.policies.includes('manage-users')) {
    return res.status(403).json({ error: 'Admin policy required' });
  }
  res.json({ message: 'Welcome, admin', identity: req.spiffeId.fullId });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Express bridge listening on :${PORT}`);
});
