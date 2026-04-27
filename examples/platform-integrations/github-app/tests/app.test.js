
const assert = require('assert');
const {
  buildVerificationContext,
  handlePullRequestEvent,
  resolvePolicyFromLabels,
  formatCheckRun,
} = require('../src');

async function run() {
  {
    const policy = resolvePolicyFromLabels([
      { name: 'docs' },
      { name: 'aport:policy:finance.payment.refund.v1' },
    ]);
    assert.strictEqual(policy, 'finance.payment.refund.v1');
  }

  {
    const context = buildVerificationContext({
      action: 'opened',
      repository: { full_name: 'aporthq/aport-integrations', owner: { login: 'aporthq' }, name: 'aport-integrations' },
      pull_request: {
        number: 42,
        title: 'Add APort gate',
        draft: false,
        user: { login: 'agent-bot' },
        head: { ref: 'feat/aport', sha: 'abc123' },
        base: { ref: 'main' },
        labels: [{ name: 'policy:code.repository.merge.v1' }],
        changed_files: 3,
        additions: 40,
        deletions: 2,
      },
    });

    assert.deepStrictEqual(context.pull_request.author, 'agent-bot');
    assert.strictEqual(context.pull_request.sha, 'abc123');
    assert.strictEqual(context.repository.full_name, 'aporthq/aport-integrations');
  }

  {
    const messages = [];
    const result = await handlePullRequestEvent(
      {
        action: 'opened',
        repository: {
          full_name: 'aporthq/aport-integrations',
          owner: { login: 'aporthq' },
          name: 'aport-integrations',
        },
        pull_request: {
          number: 7,
          title: 'Verify merges with APort',
          user: { login: 'agent-bot' },
          head: { ref: 'feat/github-app', sha: 'deadbeef' },
          base: { ref: 'main' },
          labels: [{ name: 'aport-policy:code.repository.merge.v1' }],
          changed_files: 4,
          additions: 12,
          deletions: 1,
        },
      },
      {
        aportClient: {
          verify: async (policy, agentId, context) => ({
            decision: {
              allow: true,
              decision_id: 'dec_123',
              reasons: [{ message: `checked ${policy} for ${agentId}` }],
            },
          }),
        },
        github: {
          createCheckRun: async (payload) => {
            messages.push(payload);
          },
        },
      }
    );

    assert.strictEqual(result.ignored, false);
    assert.strictEqual(result.policy, 'code.repository.merge.v1');
    assert.strictEqual(result.agentId, 'agent-bot');
    assert.strictEqual(result.decision.allow, true);
    assert.strictEqual(result.checkRun.conclusion, 'success');
    assert.ok(result.checkRun.output.summary.includes('Agent: agent-bot'));
    assert.ok(messages.length === 1);
    assert.strictEqual(messages[0].head_sha, 'deadbeef');
    assert.strictEqual(messages[0].name, 'APort policy verification');
  }

  {
    const result = await handlePullRequestEvent(
      {
        action: 'opened',
        repository: { full_name: 'aporthq/aport-integrations', owner: { login: 'aporthq' }, name: 'aport-integrations' },
        pull_request: {
          number: 8,
          title: 'Block merge',
          user: { login: 'agent-bot' },
          head: { ref: 'feat/block', sha: 'cafebabe' },
          base: { ref: 'main' },
          labels: [{ name: 'policy:code.repository.merge.v1' }],
        },
      },
      {
        aportClient: {
          verify: async () => ({
            decision: {
              allow: false,
              reasons: [{ message: 'policy denied' }],
            },
          }),
        },
      }
    );

    const formatted = formatCheckRun({
      policy: result.policy,
      decision: result.decision,
      agentId: result.agentId,
      pullRequest: { number: 8, title: 'Block merge' },
    });
    assert.strictEqual(formatted.conclusion, 'failure');
    assert.ok(formatted.output.summary.includes('policy denied'));
  }

  console.log('All tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
