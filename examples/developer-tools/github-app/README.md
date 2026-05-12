# APort GitHub PR Verifier

GitHub App example that verifies pull requests with APort before merge.

The app listens for pull request events, resolves an APort agent id, sends the pull request context to APort, and writes a GitHub check run back to the PR.

## Features

- Probot-based GitHub App entrypoint.
- Pull request checks for opened, reopened, ready-for-review, and synchronized PRs.
- Configurable APort policy pack.
- Configurable agent id source: PR author login, static id, author map, or branch name.
- Optional changed-file and label context.
- Fail-closed or neutral-on-deny mode.
- Unit tests for policy normalization, config handling, check output, and APort API calls.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Create a GitHub App and configure:

| Setting | Value |
| --- | --- |
| Webhook URL | Your deployed app URL |
| Webhook secret | Same value as `WEBHOOK_SECRET` |
| Repository permissions | Checks: read/write, Contents: read, Pull requests: read, Metadata: read |
| Subscribe to events | Pull request |

Install the GitHub App on the repositories where PR checks should run.

## Repository Configuration

Add `.github/aport.yml` to a protected repository:

```yaml
enabled: true
checkName: APort policy check
policy: code.repository.merge.v1
failOnError: true
agent:
  source: author-login
context:
  includeFiles: true
  includeLabels: true
```

Supported `agent.source` values:

| Source | Behavior |
| --- | --- |
| `author-login` | Uses the GitHub PR author login as the agent id. |
| `static` | Uses `agent.staticAgentId`. |
| `author-map` | Looks up `agent.authorMap[githubLogin]`. |
| `branch` | Uses the PR head branch name. |

Example author map:

```yaml
agent:
  source: author-map
  authorMap:
    octocat: ap_a2d10232c6534523812423eec8a1425c
```

## Environment Variables

```bash
APP_ID=123456
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
WEBHOOK_SECRET=replace_with_your_webhook_secret
APORT_API_KEY=your_aport_api_key
APORT_BASE_URL=https://aport.io
PORT=3000
```

`APORT_API_KEY` is optional for APort endpoints that support public verification, but production deployments should set it.

## Local Development

Use a webhook tunnel such as `smee.io`, `ngrok`, or a hosted deployment URL:

```bash
npm start
```

Then open or synchronize a pull request in an installed repository. The app creates a check run named `APort policy check`.

## Testing

```bash
npm test
npm run check
```

## Files

```text
src/index.js      Probot webhook registration and PR verification flow
src/aport.js      APort API client and decision normalization
src/config.js     .github/aport.yml defaults, agent resolution, PR context
src/checks.js     GitHub check-run conclusion and output helpers
examples/aport.yml Example repository configuration
```
