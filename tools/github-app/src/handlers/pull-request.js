const { verifyAgent, verifyPolicy } = require('../lib/aport-client');
const { getConfig } = require('../lib/config');

async function handlePullRequest(context, log) {
  const { payload, octokit } = context;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.pull_request.number;
  const author = payload.pull_request.user.login;
  const sha = payload.pull_request.head.sha;

  log.info(`Processing PR #${prNumber} by @${author}`);

  try {
    // Create pending check
    const check = await octokit.rest.checks.create({
      owner, repo,
      name: 'APort Agent Verification',
      head_sha: sha,
      status: 'in_progress',
      output: {
        title: 'Verifying agent identity...',
        summary: `Checking @${author} against APort policies.`,
      },
    });

    const config = await getConfig(context);

    // Verify agent
    const agentResult = await verifyAgent(author);
    
    if (!agentResult.ok) {
      await octokit.rest.checks.update({
        owner, repo, check_run_id: check.data.id,
        conclusion: 'failure',
        output: {
          title: 'Agent verification failed',
          summary: `Could not verify @${author}: ${agentResult.error}`,
        },
      });
      return;
    }

    // If policy configured, verify policy
    if (config.policyId) {
      const prContext = {
        action: 'pull_request',
        author, repo, branch: payload.pull_request.head.ref,
        files_changed: payload.pull_request.changed_files,
      };

      const policyResult = await verifyPolicy(author, config.policyId, prContext);

      await octokit.rest.checks.update({
        owner, repo, check_run_id: check.data.id,
        conclusion: policyResult.allow ? 'success' : 'failure',
        output: {
          title: policyResult.allow ? 'APort verification passed' : 'APort policy violation',
          summary: [
            `**Agent:** @${author}`,
            `**Policy:** ${config.policyId}`,
            `**Decision:** ${policyResult.allow ? 'ALLOW ✅' : 'DENY ❌'}`,
            policyResult.decisionId ? `**Decision ID:** ${policyResult.decisionId}` : '',
            policyResult.reasons?.length ? `**Reasons:** ${policyResult.reasons.join(', ')}` : '',
          ].filter(Boolean).join('\n'),
        },
      });
    } else {
      await octokit.rest.checks.update({
        owner, repo, check_run_id: check.data.id,
        conclusion: 'success',
        output: {
          title: 'APort agent verified',
          summary: `@${author} verified successfully.`,
        },
      });
    }
  } catch (error) {
    log.error(`Error processing PR #${prNumber}: ${error.message}`);
  }
}

module.exports = handlePullRequest;
