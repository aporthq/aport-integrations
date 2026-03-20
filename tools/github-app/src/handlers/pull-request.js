/**
 * Pull Request Handler
 *
 * Extracts PR metadata, calls APort verification API, and manages
 * the corresponding GitHub Check Run.
 */
const { createCheckRun, updateCheckRun } = require('./check-run');
const { verifyPolicy } = require('../lib/aport-client');
const { loadRepoConfig } = require('../lib/config');

const CHECK_NAME = 'APort Agent Verification';

module.exports = {
  async handlePullRequest(context, action) {
    const { octokit, payload } = context;
    const pr = payload.pull_request;
    const repo = payload.repository;

    const log = context.log;
    log.info(`[${action}] PR #${pr.number} by @${pr.user.login}`);

    // Load repo-level config (.aport.yml)
    const repoConfig = await loadRepoConfig(octokit, repo);

    // Determine which policy to verify
    const policyId = repoConfig.policy || process.env.DEFAULT_POLICY_ID || 'code.repository.merge.v1';

    // Derive an agent ID from the PR author
    const agentId = pr.user.login;

    try {
      // Create pending check run
      const check = await createCheckRun(octokit, {
        owner: repo.owner.login,
        repo: repo.name,
        head_sha: pr.head.sha,
        title: 'Verifying agent identity…',
        summary: `Verifying **@${agentId}** against policy **${policyId}**…`,
      });

      // Call APort API
      const result = await verifyPolicy(agentId, policyId, {
        action,
        pr_number: pr.number,
        branch: pr.head.ref,
        base_branch: pr.base.ref,
        repository: repo.full_name,
        changed_files: pr.changed_files,
        additions: pr.additions,
        deletions: pr.deletions,
      });

      const allowed = result.decision === 'ALLOW';
      const title = allowed
        ? `✅ Agent @${agentId} verified`
        : `❌ Agent @${agentId} denied by policy`;

      const summary = [
        allowed ? '✅' : '❌',
        `**APort Agent Verification**\n`,
        `| Field | Value |`,
        `|-------|-------|`,
        `| Agent | @${agentId} (${result.agent_id || 'N/A'}) |`,
        `| Policy | ${policyId} |`,
        `| Decision | **${result.decision}** |`,
        `| Decision ID | ${result.decision_id || 'N/A'} |`,
      ].join('\n');

      // Update check run with result
      await updateCheckRun(octokit, {
        owner: repo.owner.login,
        repo: repo.name,
        check_run_id: check.data.id,
        conclusion: allowed ? 'success' : 'failure',
        title,
        summary,
      });

      log.info(`PR #${pr.number}: ${result.decision} (agent=${agentId}, policy=${policyId})`);
    } catch (err) {
      log.error(`PR #${pr.number} verification failed:`, err.message);

      // Best-effort: try to create a failure check run
      try {
        await createCheckRun(octokit, {
          owner: repo.owner.login,
          repo: repo.name,
          head_sha: pr.head.sha,
          title: '⚠️ APort verification error',
          summary: `Error: ${err.message}`,
          conclusion: 'neutral',
        });
      } catch (_) {
        // swallow
      }
    }
  },
};
