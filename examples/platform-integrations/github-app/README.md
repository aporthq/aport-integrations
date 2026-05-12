# APort GitHub PR Verifier

GitHub App example that blocks or approves pull requests with an APort policy check.

The app receives `pull_request` webhooks, sends repository and pull request context to APort, then writes a GitHub Check Run named `APort policy verification` on the pull request head commit.

## What It Does

- Verifies pull requests against a configurable APort policy pack.
- Supports different policies through `APORT_POLICY_PACK`.
- Passes PR context such as base branch, head SHA, author, labels, file counts, and configured allowed base branches.
- Creates a GitHub Check Run with `success`, `failure`, or `neutral`.
- Handles webhook signature verification, installation authentication, API failures, and missing configuration.

## Quick Start

```bash
npm install
cp env.example .env
npm start
```

Expose the local server to GitHub with a tunnel such as `ngrok` and set the GitHub App webhook URL to:

```text
https://your-public-url.example/webhooks/github
```

## GitHub App Setup

Create a GitHub App with:

- Webhook event: `Pull request`
- Repository permission: `Checks: Read and write`
- Repository permission: `Pull requests: Read-only`
- Webhook secret matching `GITHUB_WEBHOOK_SECRET`

Install the app on the repositories you want to protect.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `GITHUB_APP_ID` | Yes | GitHub App numeric ID. |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key. Newlines may be escaped as `\n`. |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret used to verify GitHub webhook signatures. |
| `APORT_API_KEY` | Yes | API key used to call APort. |
| `APORT_AGENT_ID` | Yes | APort passport/agent identity for this GitHub App. |
| `APORT_BASE_URL` | No | Defaults to `https://aport.io`. |
| `APORT_POLICY_PACK` | No | Defaults to `code.repository.merge.v1`. |
| `APORT_ALLOWED_BASE_BRANCHES` | No | Comma-separated branch list included in policy context. |
| `APORT_FAIL_ON_ERROR` | No | Defaults to `true`; set `false` to make API errors neutral. |

## Policy Context

The app sends this shape to APort:

```json
{
  "event": "pull_request",
  "action": "opened",
  "repository": {
    "full_name": "aporthq/example",
    "default_branch": "main"
  },
  "pull_request": {
    "number": 42,
    "author": "contributor",
    "base": { "ref": "main" },
    "head": { "sha": "abc123" },
    "changed_files": 3,
    "labels": ["security"]
  },
  "policy_config": {
    "allowed_base_branches": ["main", "develop"]
  }
}
```

## Running Tests

```bash
npm test
```

The test suite mocks both APort and GitHub, so it does not need a live GitHub App, webhook secret, or APort key.
