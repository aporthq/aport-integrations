/**
 * APort GitHub App — Probot Entry Point
 *
 * Listens for pull_request events and runs APort policy verification
 * via GitHub Check Runs.
 */
module.exports = (app) => {
  const { handlePullRequest } = require('./handlers/pull-request');

  // PR opened — create a new check run
  app.on('pull_request.opened', async (context) => {
    await handlePullRequest(context, 'opened');
  });

  // PR synchronize (new push to the branch) — update the check run
  app.on('pull_request.synchronize', async (context) => {
    await handlePullRequest(context, 'synchronize');
  });

  // PR reopened — re-verify
  app.on('pull_request.reopened', async (context) => {
    await handlePullRequest(context, 'reopened');
  });
};
