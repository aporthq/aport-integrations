# 🔐 APort GitHub App

**GitHub App for PR/Merge verification using APort policy packs.**

Automatically verify pull requests against APort policy packs before merging. When a PR is opened or updated, the app calls the APort API to check compliance and creates a commit status (success/failure) on the PR.

## 🎯 Features

- **PR Event Handling** — Listens for `pull_request.opened` and `pull_request.synchronize` webhook events
- **APort Verification** — Calls APort API to verify the PR author against a configurable policy pack
- **Commit Status** — Creates `APort/PR-Verify` commit statuses (pending → success/failure)
- **Configurable Policies** — Support for `code.repository.merge.v1`, `admin.access.v1`, and custom policy packs
- **Webhook Signature Verification** — Validates GitHub webhook payload signatures using HMAC-SHA256
- **GitHub App Auth** — JWT-based authentication for installation access tokens
- **Error Handling** — Graceful failure with descriptive commit statuses
- **Structured Logging** — Configurable log levels (debug/info/warn/error)

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **GitHub App** ([Create one here](https://github.com/settings/apps/new))
- **APort Account** ([Sign up](https://aport.io/dashboard))

### 1. Install Dependencies

```bash
cd examples/platform-integrations/github-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | Your GitHub App ID (from App settings page) |
| `GITHUB_PRIVATE_KEY` | Private key for JWT generation (PEM format) |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret for payload signature verification |
| `APORT_API_KEY` | APort API key for verification calls |
| `PORT` | Server port (default: `3000`) |
| `DEFAULT_POLICY_PACK` | Policy pack for PR verification (default: `code.repository.merge.v1`) |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error` (default: `info`) |

### 3. Configure GitHub App

In your GitHub App settings:

1. **Webhook URL**: `https://your-server.com/` (or use a tunneling service like ngrok for local dev)
2. **Webhook secret**: Same as `GITHUB_WEBHOOK_SECRET` in your `.env`
3. **Permissions**:
   - Repository > Commit statuses: **Read & write**
   - Repository > Pull requests: **Read-only**
   - Repository > Metadata: **Read-only** (auto-selected)
4. **Subscribe to events**: **Pull request**
5. **Install the app** on your repository

### 4. Start the Server

```bash
npm start
```

## 🏗️ Project Structure

```
github-app/
├── README.md              # This file
├── package.json           # Node.js dependencies
├── .env.example           # Environment variables template
├── .gitignore
├── src/
│   ├── index.js           # Webhook server entry point & PR handler
│   ├── client.js          # APort API client wrapper
│   └── github.js          # GitHub API helpers (JWT, status, signature)
├── tests/
│   ├── client.test.js     # APort client unit tests (7 tests)
│   ├── github.test.js     # GitHub helper unit tests (12 tests)
│   └── index.test.js      # Server & validation tests (9 tests)
└── examples/
    └── basic-usage.js     # Standalone usage without running the server
```

## 🔧 Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│   GitHub      │────▶│  APort           │────▶│  APort   │
│   (PR Event)  │◀────│  GitHub App      │◀────│  API     │
└──────────────┘     └──────────────────┘     └──────────┘
                              │
                      ┌───────┴───────┐
                      │  client.js     │  ← Axios HTTP → APort API
                      │  github.js     │  ← JWT + Status API
                      │  index.js      │  ← HTTP server + webhook handler
                      └───────────────┘
```

### Verification Flow

1. GitHub sends a `pull_request` webhook event to the server
2. Server verifies the webhook signature (HMAC-SHA256)
3. For `opened`/`synchronize` events, sets commit status to `pending`
4. Calls APort API: `POST /api/verify/policy/{policyPack}` with PR context
5. Sets final commit status:
   - `success` — APort approved the verification
   - `failure` — APort denied the verification
   - `error` — API call failed

### Commit Statuses

| State | Description | When |
|---|---|---|
| `pending` | APort verification in progress... | Immediately after receiving webhook |
| `success` | Approved by APort (policy: XXX) | APort returns `decision.allow === true` |
| `failure` | Reasons from APort decision | APort returns `decision.allow === false` |
| `error` | APort API error details | Network errors or API failures |

## 📋 Supported Policy Packs

| Policy | Description |
|---|---|
| `code.repository.merge.v1` | PR merge verification (default) |
| `admin.access.v1` | Administrative access control |
| `finance.payment.refund.v1` | Refund processing with amount limits |
| `data.export.v1` | Data export with row limits |

To use a different policy pack, set `DEFAULT_POLICY_PACK` in your `.env` file.

## 🧪 Testing

```bash
npm test
```

Tests cover (28 tests total):

**client.test.js** (11 tests):
- Constructor: default options, custom options, Authorization header, base URL, timeout, Content-Type
- verify: function type, correct API call, network errors, API error responses
- getPassport: successful retrieval, fallback error

**github.test.js** (12 tests):
- Constructor: env-based init, options-based init, escaped newlines in key, raw newlines
- verifySignature: no-secret bypass, missing signature, invalid signature, valid signature
- generateJWT: missing appId, missing privateKey, valid JWT structure
- createCommitStatus: missing SHA, invalid state
- buildVerifyContext: full payload extraction, minimal payload, sender fallback

**index.test.js** (5 tests):
- Server: creation, health endpoint, method validation, signature check, unhandled events

## 📚 API Reference

### APortClient

```javascript
const { APortClient } = require("./src/client");
const client = new APortClient({ apiKey, baseUrl });

// Verify an agent against a policy pack
await client.verify(policy, agentId, context);

// Get passport information for an agent
await client.getPassport(agentId);

// List all available policy packs
await client.listPolicies();
```

### GitHubHelper

```javascript
const GitHubHelper = require("./src/github");
const github = new GitHubHelper({ appId, privateKey, webhookSecret });

// Verify webhook payload signature
github.verifySignature(payload, signature);

// Generate JWT for GitHub App authentication
github.generateJWT();

// Get installation access token
await github.getInstallationToken(installationId);

// Create a commit status on a PR
await github.createCommitStatus({
  token, owner, repo, sha,
  state: "success",
  description: "Verification passed",
  context: "APort/PR-Verify",
});

// Build verification context from webhook payload
github.buildVerifyContext(payload);
```

## 🔒 Security

- Never commit `.env` files or hardcode secrets
- Use environment variables for all credentials
- Webhook signatures are verified using HMAC-SHA256
- JWT tokens are short-lived (10 minutes)
- Error messages in commit statuses do not expose sensitive API details
- Private keys with escaped newlines (`\n`) are automatically normalized

## 🤝 Contributing

Contributions welcome! This integration is part of the [APort Integrations](https://github.com/aporthq/aport-integrations) repository. See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT — See [LICENSE](../../../LICENSE) in the root repository.
