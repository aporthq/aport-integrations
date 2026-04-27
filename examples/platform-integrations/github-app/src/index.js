
const {
  handlePullRequestEvent,
  formatCheckRun,
  normalizeDecision,
} = require('./github-app');
const {
  buildVerificationContext,
  extractAgentId,
  resolvePolicyFromLabels,
} = require('./policy');

module.exports = {
  buildVerificationContext,
  extractAgentId,
  formatCheckRun,
  handlePullRequestEvent,
  normalizeDecision,
  resolvePolicyFromLabels,
};
