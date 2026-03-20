const { Probot, Octokit } = require('probot');
const handlePullRequest = require('./handlers/pull-request');

module.exports = (app) => {
  app.on('pull_request.opened', async (context) => {
    await handlePullRequest(context, app.log);
  });
  app.on('pull_request.synchronize', async (context) => {
    await handlePullRequest(context, app.log);
  });
  app.on('pull_request.reopened', async (context) => {
    await handlePullRequest(context, app.log);
  });
};
