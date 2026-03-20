async function createCheckRun(octokit, owner, repo, sha, title, summary) {
  return await octokit.rest.checks.create({
    owner, repo, head_sha: sha,
    name: 'APort Agent Verification',
    status: 'in_progress',
    output: { title, summary },
  });
}

async function updateCheckRun(octokit, owner, repo, checkRunId, conclusion, output) {
  return await octokit.rest.checks.update({
    owner, repo, check_run_id: checkRunId, conclusion,
    output,
  });
}

module.exports = { createCheckRun, updateCheckRun };
