
    const {
      buildVerificationContext,
      extractAgentId,
      resolvePolicyFromLabels,
    } = require('./policy');

    const ALLOWED_ACTIONS = new Set(['opened', 'reopened', 'synchronize', 'labeled']);

    function normalizeDecision(result) {
      return result?.data?.decision || result?.decision || result || {};
    }

    function formatCheckRun({ policy, decision, agentId, pullRequest }) {
      const allowed = Boolean(decision.allow ?? decision.verified ?? false);
      const conclusion = allowed ? 'success' : 'failure';
      const summaryLines = [
        `Agent: ${agentId}`,
        `Policy: ${policy}`,
        `PR: #${pullRequest.number || 'unknown'} ${pullRequest.title || ''}`.trim(),
      ];

      if (Array.isArray(decision.reasons) && decision.reasons.length > 0) {
        summaryLines.push('', 'Reasons:');
        for (const reason of decision.reasons) {
          summaryLines.push(`- ${reason.message || String(reason)}`);
        }
      } else if (decision.reason) {
        summaryLines.push('', `Reason: ${decision.reason}`);
      }

      return {
        conclusion,
        output: {
          title: allowed ? 'APort verification passed' : 'APort verification failed',
          summary: summaryLines.join(String.fromCharCode(10)),
        },
      };
    }

    async function handlePullRequestEvent(payload, deps) {
      const { aportClient, github, defaultPolicy = 'code.repository.merge.v1' } = deps || {};
      if (!aportClient || typeof aportClient.verify !== 'function') {
        throw new Error('aportClient with verify(policy, agentId, context) is required');
      }

      const action = payload?.action;
      const pullRequest = payload?.pull_request || {};

      if (!ALLOWED_ACTIONS.has(action) || !pullRequest.number) {
        return {
          ignored: true,
          reason: 'unsupported action or payload',
        };
      }

      const policy = resolvePolicyFromLabels(pullRequest.labels, defaultPolicy);
      const agentId = extractAgentId(payload);
      const context = buildVerificationContext(payload);
      const rawResult = await aportClient.verify(policy, agentId, context);
      const decision = normalizeDecision(rawResult);
      const checkRun = formatCheckRun({
        policy,
        decision,
        agentId,
        pullRequest,
      });

      if (github && typeof github.createCheckRun === 'function') {
        await github.createCheckRun({
          name: 'APort policy verification',
          head_sha: pullRequest.head?.sha || '',
          ...checkRun,
        });
      }

      return {
        ignored: false,
        policy,
        agentId,
        decision,
        checkRun,
        verificationContext: context,
      };
    }

    module.exports = {
      ALLOWED_ACTIONS,
      formatCheckRun,
      handlePullRequestEvent,
      normalizeDecision,
    };
