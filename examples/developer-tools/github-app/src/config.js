const DEFAULT_CONFIG = {
  enabled: true,
  checkName: "APort policy check",
  policy: "code.repository.merge.v1",
  failOnError: true,
  agent: {
    source: "author-login",
    staticAgentId: "",
    authorMap: {},
  },
  context: {
    includeFiles: true,
    includeLabels: true,
  },
};

function mergeConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    agent: {
      ...DEFAULT_CONFIG.agent,
      ...(config.agent || {}),
    },
    context: {
      ...DEFAULT_CONFIG.context,
      ...(config.context || {}),
    },
  };
}

function resolveAgentId(config, pullRequest) {
  const source = config.agent.source;

  if (source === "static") {
    return config.agent.staticAgentId || undefined;
  }

  if (source === "author-map") {
    return config.agent.authorMap[pullRequest.user.login];
  }

  if (source === "branch") {
    return pullRequest.head.ref;
  }

  return pullRequest.user.login;
}

function labelsForPullRequest(pullRequest) {
  return (pullRequest.labels || []).map((label) => label.name);
}

async function filesForPullRequest(context, pullRequest, includeFiles) {
  if (!includeFiles) {
    return [];
  }

  const response = await context.octokit.pulls.listFiles(
    context.repo({
      pull_number: pullRequest.number,
      per_page: 100,
    })
  );

  return response.data.map((file) => ({
    filename: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    status: file.status,
  }));
}

async function buildVerificationContext(context, config, pullRequest) {
  const labels = config.context.includeLabels ? labelsForPullRequest(pullRequest) : [];
  const files = await filesForPullRequest(context, pullRequest, config.context.includeFiles);

  return {
    repository: context.payload.repository.full_name,
    pullRequest: {
      number: pullRequest.number,
      title: pullRequest.title,
      author: pullRequest.user.login,
      base: pullRequest.base.ref,
      head: pullRequest.head.ref,
      draft: pullRequest.draft,
      labels,
      files,
    },
  };
}

module.exports = {
  DEFAULT_CONFIG,
  buildVerificationContext,
  labelsForPullRequest,
  mergeConfig,
  resolveAgentId,
};
