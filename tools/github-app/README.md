# APort GitHub App

Enforces APort agent identity verification and policy checks on pull requests.

## Setup

1. **Create a GitHub App** using `app.yml` manifest
2. **Install the App** on your target repository
3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Run locally** (using [smee](https://smee.io) for webhook forwarding):
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_ID` | GitHub App ID | Yes |
| `PRIVATE_KEY_PATH` | Path to private key `.pem` | Yes |
| `WEBHOOK_SECRET` | Webhook secret | Yes |
| `APORT_API_KEY` | APort API key | Yes |
| `APORT_BASE_URL` | APort API base URL | No (default: `https://api.aport.io`) |
| `DEFAULT_POLICY_ID` | Default policy to check | No |

### Config-as-Code (.aport.yml)

Add `.aport.yml` to your repo root to customize behavior:

```yaml
aport:
  policy_id: code.repository.merge.v1
  skip_branches:
    - main
  require_verification: true
```

## Check Run Output

On every PR, a check run is created:

```
✅ APort Agent Verification
Agent: @username
Policy: code.repository.merge.v1
Decision: ALLOW
Decision ID: xxx
```

## Tech Stack

- [Probot](https://probot.github.io/) — GitHub App framework
- [Octokit](https://github.com/octokit/rest.js) — GitHub API client
- [APort API](https://aport.io/docs) — Agent verification
