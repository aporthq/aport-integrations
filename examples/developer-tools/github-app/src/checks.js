function conclusionForVerification(verification, failOnError) {
  if (verification.allowed) {
    return "success";
  }

  return failOnError ? "failure" : "neutral";
}

function outputForVerification({ verification, agentId, policy }) {
  if (verification.allowed) {
    return {
      title: "APort policy approved",
      summary: "Agent `" + agentId + "` is allowed by policy `" + policy + "`.",
    };
  }

  return {
    title: "APort policy denied",
    summary:
      "Agent `" +
      (agentId || "unknown") +
      "` was not allowed by policy `" +
      policy +
      "`.\n\nReason: " +
      (verification.reason || "No reason returned by APort."),
  };
}

async function createCompletedCheckRun({ context, pullRequest, checkName, conclusion, output }) {
  return context.octokit.checks.create(
    context.repo({
      name: checkName,
      head_sha: pullRequest.head.sha,
      status: "completed",
      conclusion,
      output,
    })
  );
}

module.exports = {
  conclusionForVerification,
  createCompletedCheckRun,
  outputForVerification,
};
