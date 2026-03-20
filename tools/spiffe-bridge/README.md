# SPIFFE/SPIRE ↔ APort Integration Bridge

Bridge that translates SPIFFE/SPIRE identities (SVIDs) into APort passport format, enabling cloud-native workloads to authenticate through APort's policy engine.

## Architecture

```
┌──────────┐   mTLS    ┌───────────────┐   translate    ┌──────────┐
│  Client   │──────────▶│  SPIFFE-APort  │──────────────▶│  APort   │
│ Workload  │  SVID     │    Bridge      │   passport    │  Server  │
└──────────┘           └───────┬───────┘                └──────────┘
                               │
                        ┌──────▼───────┐
                        │ SPIRE Agent   │
                        │ (Workload API)│
                        └──────────────┘
```

## Concepts

| Term | Description |
|------|-------------|
| **SVID** | SPIFFE Verifiable Identity Document — an X.509 certificate with a SPIFFE ID in the URI SAN |
| **SPIFFE ID** | URI format: `spiffe://<trust-domain>/<workload-path>` |
| **Workload API** | Unix socket (default: `/tmp/spire-agent/public/api.sock`) providing SVIDs |
| **Bundle** | Trust domain root certificates for SVID validation |
| **APort Passport** | APort's identity document — roles, policies, agent ID |

## Setup

### 1. Prerequisites

- Node.js >= 18
- SPIRE agent running with Workload API enabled
- APort instance (optional, for policy verification)

### 2. Install

```bash
cd tools/spiffe-bridge
npm install
```

### 3. Configure

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SPIFFE_ENDPOINT_SOCKET` | `/tmp/spire-agent/public/api.sock` | Workload API socket path |
| `APORT_API_KEY` | _(empty)_ | APort API key |
| `APORT_BASE_URL` | `http://localhost:3000` | APort server URL |
| `SVID_REFRESH_MS` | `5000` | SVID watch poll interval |

### 4. Run as CLI

```bash
npm start
```

Output:
```
[spiffe-bridge] Starting SPIFFE ↔ APort Bridge...
[spiffe-bridge] Trust Domain : example.org
[spiffe-bridge] Workload Path: /frontend/web
[spiffe-bridge] SPIFFE ID    : spiffe://example.org/frontend/web
[spiffe-bridge] APort Agent  : agent-frontend
[spiffe-bridge] Roles        : web-user, api-consumer
```

## Usage

### As Express Middleware

```js
const express = require('express');
const { spiffeMiddleware } = require('aport-spiffe-bridge');

const app = express();
app.use(spiffeMiddleware());

app.get('/api/data', (req, res) => {
  // req.spiffeId — parsed SPIFFE ID
  // req.passport  — APort passport with roles & policies
  res.json({ agent: req.passport.agentId });
});

app.listen(8080);
```

### Programmatic API

```js
const SpiffeClient = require('aport-spiffe-bridge/src/spiffe-client');
const APortAdapter = require('aport-spiffe-bridge/src/aport-adapter');

const client = new SpiffeClient();
const adapter = new APortAdapter();

const { svid, bundle } = await client.fetchSVID();
const parsedId = client.parseSpiffeId(svid);

// Convert to APort passport
const passport = adapter.spiffeToPassport(svid, parsedId);

// Get agent identity
const identity = adapter.getAgentIdentity(svid, parsedId);

// Verify via APort
const result = await adapter.verifyWithAPort(passport, 'read');
```

## Mapping Rules

SPIFFE IDs are mapped to APort roles via glob patterns:

| Pattern | Agent | Roles | Policies |
|---------|-------|-------|----------|
| `spiffe://*/frontend/*` | agent-frontend | web-user, api-consumer | read-public, write-own |
| `spiffe://*/backend/*` | agent-backend | service, api-provider | read-all, write-data |
| `spiffe://*/admin/*` | agent-admin | admin, operator | read-all, write-all, manage-users |

Customize in `src/config.js` or extend the rules array.

## File Structure

```
tools/spiffe-bridge/
├── package.json
├── README.md
├── src/
│   ├── index.js          # CLI entry point
│   ├── config.js         # Configuration
│   ├── spiffe-client.js  # SPIFFE Workload API client
│   ├── aport-adapter.js  # SPIFFE ↔ APort translation
│   └── middleware.js     # Express middleware
└── examples/
    └── express-bridge.js # Express usage example
```

## License

MIT
