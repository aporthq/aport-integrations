/**
 * GitHub Check Run helpers
 *
 * createCheckRun  — create a check run (optionally with a conclusion for neutral/error)
 * updateCheckRun  — update conclusion, title, and summary
 */

const CHECK_NAME = 'APort Agent Verification';

/**
 * Create a GitHub Check Run.
 * @param {import('@octokit/rest')} octokit
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.head_sha
 * @param {string} [opts.title]
 * @param {string} [opts.summary]
 * @param {'success'|'failure'|'neutral'|'cancelled'|'timed_out'} [opts.conclusion]
 */
async function createCheckRun(octokit, { owner, repo, head_sha, title, summary, conclusion }) {
  const body = {
    owner,
    repo,
    name: CHECK_NAME,
    head_sha,
    status: conclusion ? 'completed' : 'in_progress',
  };
  if (conclusion) body.conclusion = conclusion;
  if (title || summary) {
    body.output = { title: title || '', summary: summary || '' };
  }
  return octokit.rest.checks.create(body);
}

/**
 * Update an existing GitHub Check Run.
 * @param {import('@octokit/rest')} octokit
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {number} opts.check_run_id
 * @param {'success'|'failure'|'neutral'|'cancelled'|'timed_out'} opts.conclusion
 * @param {string} [opts.title]
 * @param {string} [opts.summary]
 */
async function updateCheckRun(octokit, { owner, repo, check_run_id, conclusion, title, summary }) {
  const body = {
    owner,
    repo,
    check_run_id,
    status: 'completed',
    conclusion,
  };
  if (title || summary) {
    body.output = { title: title || '', summary: summary || '' };
  }
  return octokit.rest.checks.update(body);
}

module.exports = { createCheckRun, updateCheckRun };
