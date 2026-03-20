const express = require('express');
const { createSpiffeAportMiddleware } = require('../src/middleware');
const app = express();
app.use(express.json());
app.use(createSpiffeAportMiddleware({
  aportBaseUrl: process.env.APORT_BASE_URL || 'https://api.aport.io',
  aportApiKey: process.env.APORT_API_KEY,
  policyId: 'code.repository.merge.v1',
  skipPaths: ['/health'],
}));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/protected', (req, res) => res.json({ agent: req.agent, spiffe: req.spiffe }));
app.listen(3000, () => console.log('SPIFFE-APort bridge listening on :3000'));
