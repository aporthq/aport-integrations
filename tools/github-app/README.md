# APort Guard — GitHub App for PR/Merge Verification

[APort](https://aport.io) agent identity verification as a GitHub Check Run on every pull request.

## How It Works

1. A pull request is opened or updated.
2. The app creates a **pending** Check Run.
3. It calls the APort API to verify the PR author's agent identity against the configured policy.
4. The Check Run is updated to **success** (✅ ALLOW) or **failure** (❌ DENY).

## Setup

### 1. Create the GitHub App

1. Go to [GitHub Developer Settings → New GitHub App](https://github.com/settings/apps/new).
2. Fill in:
   - **GitHub App name**: `APort Guard`
   - **Homepage URL**: `https://aport.io`
   - **Webhook URL**: your Probot server URL (e.g. `https://your-domain.ngrok.io/api/github/webhook`)
   - **Webhook secret**: generate and save for `.env`
3. Permissions:
   - **Checks**: Read & Write
   - **Pull requests**: Read
   - **Contents**: Read
   - **Metadata**: Read-only
4. Subscribe to events: **Pull request**
5. Generate a private key and download the `.pem` file.

### 2. Install to Repositories

From the app settings page → **Install App** → select repositories.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `APP_ID` | GitHub App ID (from app settings) |
| `PRIVATE_KEY_PATH` | Path to the downloaded `.pem` file |
| `WEBHOOK_SECRET` | Webhook secret you generated |
| `APORT_API_KEY` | APort API key |
| `APORT_BASE_URL` | APort API base URL (default: `https://api.aport.io`) |
| `DEFAULT_POLICY_ID` | Policy to verify (default: `code.repository.merge.v1`) |

### 4. Run Locally

```bash
npm install
npm run dev
```

Or deploy to production:

```bash
npm install --production
npm start
```

## Repository Configuration (Config-as-Code)

Place a `.aport.yml` file in the repository root to customize behavior:

```yaml
# Policy ID to verify against
policy: code.repository.merge.v1

# Branches to skip verification
skip_branches:
  - dependabot/**
  - renovate/**

# GitHub usernames exempt from verification
exempt_users:
  - dependabot[bot]
  - renovate[bot]
```

## Check Run Output

On success:

```
✅ APort Agent Verification

| Field        | Value                        |
|--------------|------------------------------|
| Agent        | @username (agent_id: xxx)    |
| Policy       | code.repository.merge.v1     |
| Decision     | **ALLOW**                    |
| Decision ID  | dec_abc123                   |
```

On failure:

```
❌ APort Agent Verification

| Field        | Value                        |
|--------------|------------------------------|
| Agent        | @username (agent_id: xxx)    |
| Policy       | code.repository.merge.v1     |
| Decision     | **DENY**                     |
| Decision ID  | dec_xyz789                   |
```

## Project Structure

```
tools/github-app/
├── app.yml                  # GitHub App manifest
├── package.json             # Dependencies & scripts
├── .env.example             # Environment template
├── README.md                # This file
└── src/
    ├── index.js             # Probot entry point
    ├── handlers/
    │   ├── pull-request.js  # PR event handler
    │   └── check-run.js     # Check Run CRUD helpers
    └── lib/
        ├── aport-client.js  # APort REST API client
        └── config.js        # Config manager (.env + .aport.yml)
```

## License

MIT
