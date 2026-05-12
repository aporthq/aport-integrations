const CHECK_NAME = "APort policy verification";

async function createPullRequestCheck(octokit, payload, result) {
  const repository = payload.repository;
  const pullRequest = payload.pull_request;
  const headSha = pullRequest.head && pullRequest.head.sha;

  if (!repository || !repository.owner || !headSha) {
    throw new Error(
      "Unable to create check run: repository owner or head SHA missing"
    );
  }

  return octokit.rest.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    name: CHECK_NAME,
    head_sha: headSha,
    status: "completed",
    conclusion: result.conclusion,
    output: {
      title: result.title,
      summary: result.summary,
      text: result.text,
    },
  });
}

module.exports = { CHECK_NAME, createPullRequestCheck };
