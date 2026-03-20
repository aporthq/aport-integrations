# APort SPIFFE/SPIRE Bridge

Bridge that converts SPIFFE/SPIRE identities to APort passports for unified agent verification.

## Architecture
\`\`\`
SPIFFE Workload API → SVID (X.509) → APort Adapter → APort Policy Check
\`\`\`

## Usage
\`\`\`bash
npm install
APORT_API_KEY=your_key node src/index.js
\`\`\`

## Express Middleware
\`\`\`js
const { createSpiffeAportMiddleware } = require('aport-spiffe-bridge');
app.use(createSpiffeAportMiddleware({ policyId: 'your-policy-id' }));
\`\`\`

## Components
- **SpiffeClient** — Fetches X509-SVID from Workload API socket
- **AportAdapter** — Converts SVID to APort passport, calls APort API
- **Middleware** — Express middleware for mTLS + APort verification
