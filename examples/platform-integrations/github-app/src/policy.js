
const DEFAULT_POLICY_PREFIXES = ['aport:policy:', 'aport-policy:', 'policy:'];

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((label) => {
      if (!label) return '';
      if (typeof label === 'string') return label.trim();
      if (typeof label.name === 'string') return label.name.trim();
      return '';
    })
    .filter(Boolean);
}

function resolvePolicyFromLabels(labels, fallbackPolicy = 'code.repository.merge.v1') {
  const normalized = normalizeLabels(labels);
  for (const label of normalized) {
    for (const prefix of DEFAULT_POLICY_PREFIXES) {
      if (label.toLowerCase().startsWith(prefix)) {
        return label.slice(prefix.length).trim() || fallbackPolicy;
      }
    }
  }
  return fallbackPolicy;
}

function extractAgentId(payload) {
  return payload?.pull_request?.user?.login || payload?.sender?.login || 'unknown-agent';
}

function buildVerificationContext(payload) {
  const pull = payload?.pull_request || {};
  const repo = payload?.repository || {};
  return {
    event: payload?.action ? 'pull_request' : 'unknown',
    action: payload?.action || 'unknown',
    repository: {
      full_name: repo.full_name || repo.name || '',
      owner: repo.owner?.login || repo.owner?.name || '',
      name: repo.name || '',
    },
    pull_request: {
      number: pull.number || null,
      title: pull.title || '',
      state: pull.state || '',
      draft: Boolean(pull.draft),
      author: pull.user?.login || '',
      branch: pull.head?.ref || '',
      sha: pull.head?.sha || '',
      base_branch: pull.base?.ref || '',
      labels: normalizeLabels(pull.labels),
      changed_files: typeof pull.changed_files === 'number' ? pull.changed_files : null,
      additions: typeof pull.additions === 'number' ? pull.additions : null,
      deletions: typeof pull.deletions === 'number' ? pull.deletions : null,
    },
  };
}

module.exports = {
  DEFAULT_POLICY_PREFIXES,
  buildVerificationContext,
  extractAgentId,
  normalizeLabels,
  resolvePolicyFromLabels,
};
