function buildPullRequestContext(payload, options = {}) {
  const repository = payload.repository || {};
  const pullRequest = payload.pull_request || {};
  const sender = payload.sender || {};

  return {
    event: "pull_request",
    action: payload.action,
    repository: {
      id: repository.id,
      name: repository.name,
      full_name: repository.full_name,
      private: repository.private,
      default_branch: repository.default_branch,
      owner: repository.owner && repository.owner.login,
    },
    pull_request: {
      number: pullRequest.number,
      title: pullRequest.title,
      body: pullRequest.body || "",
      state: pullRequest.state,
      draft: Boolean(pullRequest.draft),
      url: pullRequest.html_url,
      author: pullRequest.user && pullRequest.user.login,
      base: {
        ref: pullRequest.base && pullRequest.base.ref,
        sha: pullRequest.base && pullRequest.base.sha,
      },
      head: {
        ref: pullRequest.head && pullRequest.head.ref,
        sha: pullRequest.head && pullRequest.head.sha,
        repo:
          pullRequest.head &&
          pullRequest.head.repo &&
          pullRequest.head.repo.full_name,
      },
      changed_files: pullRequest.changed_files,
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
      labels: (pullRequest.labels || []).map((label) => label.name),
      requested_reviewers: (pullRequest.requested_reviewers || []).map(
        (reviewer) => reviewer.login
      ),
    },
    sender: {
      login: sender.login,
      type: sender.type,
    },
    policy_config: {
      allowed_base_branches: options.allowedBaseBranches || [],
    },
  };
}

module.exports = { buildPullRequestContext };
