# APort GitHub App

GitHub App that enforces APort verification checks on pull requests.

## Overview

This GitHub App integrates with APort to verify:
- Pull request opened events
- Pull request updates (synchronize)
- Pull request reviews
- Merge attempts

## Prerequisites

- Node.js 18+
- GitHub App credentials
- APort API key

## Setup

### 1. Create GitHub App

1. Go to GitHub Developer Settings → GitHub Apps → New GitHub App
2. Set the following:
   - **Homepage URL**: Your app website
   - **Webhook URL**: Your server URL (e.g., ngrok)
   - **Permissions**:
     - Pull requests: Read & write
     - Issues: Read & write
     - Repository contents: Read & write
   - **Events**: Pull request, Pull request review

3. Generate a private key
4. Note your App ID

### 2. Configure Environment

```env
GITHUB_APP_ID=your-app-id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret
APORT_API_KEY=your-aport-api-key
APORT_PROJECT_ID=your-project-id
```

### 3. Install and Run

```bash
npm install
node index.js
```

### 4. Expose to Internet

Use ngrok or similar:
```bash
ngrok http 3000
```

## Events Handled

### Pull Request Opened
- Verifies the PR creator
- Adds "aport-verification-denied" label if blocked
- Comments with denial reasons

### Pull Request Updated
- Creates check run with verification result
- Shows ✅ or ❌ status

### Pull Request Review
- Warns on approve/changes_requested
- Can block merges

### Pull Request Merged
- Verifies merge initiator
- Adds warning comment if flagged

## Configuration Options

| Env Variable | Description |
|-------------|-------------|
| `GITHUB_APP_ID` | Your GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Private key (.pem file content) |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret |
| `APORT_API_KEY` | Your APort API key |
| `APORT_PROJECT_ID` | APort project ID |

## Deployment

### Glitch
1. Create new Glitch project
2. Add environment variables
3. Deploy

### Heroku
```bash
heroku create aport-github-app
heroku config:set GITHUB_APP_ID=xxx
heroku config:set GITHUB_PRIVATE_KEY="$(cat private-key.pem)"
heroku config:set APORT_API_KEY=xxx
heroku config:set GITHUB_WEBHOOK_SECRET=xxx
git push heroku main
```

### Docker
```bash
docker build -t aport-github-app .
docker run -d \
  -e GITHUB_APP_ID=xxx \
  -e GITHUB_PRIVATE_KEY="$(cat private-key.pem)" \
  -e GITHUB_WEBHOOK_SECRET=xxx \
  -e APORT_API_KEY=xxx \
  aport-github-app
```

## API Reference

The app makes POST requests to APort:

```json
{
  "action": "pr_opened",
  "actor": {
    "id": "username",
    "name": "Display Name",
    "owner": "github"
  },
  "context": {
    "data": {
      "repo": "owner/repo",
      "pr_number": 1,
      "title": "Fix bug"
    }
  },
  "projectId": "default"
}
```

## License

MIT
