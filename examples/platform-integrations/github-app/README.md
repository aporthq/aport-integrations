
# APort GitHub App Example

A small, dependency-free GitHub App example that runs APort policy checks on pull requests and reports the result as a check run.

## What it does

- Listens for `pull_request` events
- Picks a policy from PR labels or a default policy
- Uses the PR author login as the APort agent identity
- Sends the repo, branch, title, labels, and changed-file metadata as verification context
- Produces a check-run friendly success/failure summary

## Quick start

```bash
npm test
```

## Policy selection

The example looks for these label patterns in order:

- `aport:policy:<policy-name>`
- `aport-policy:<policy-name>`
- `policy:<policy-name>`

If none are present, it falls back to `APORT_DEFAULT_POLICY` (default: `code.repository.merge.v1`).

## Example flow

```js
const { handlePullRequestEvent } = require('./src');

const result = await handlePullRequestEvent(webhookPayload, {
  aportClient,
  github: {
    createCheckRun: async (request) => {
      console.log(request);
    },
  },
});
```

## Environment variables

- `APORT_API_KEY` — API key for live verification
- `APORT_BASE_URL` — APort API base URL
- `APORT_DEFAULT_POLICY` — policy to apply when no label is present
- `GITHUB_WEBHOOK_SECRET` — standard GitHub App webhook secret

## Files

- `src/policy.js` — label parsing and verification-context helpers
- `src/github-app.js` — webhook handler and check-run payload builder
- `tests/app.test.js` — dependency-free unit tests
