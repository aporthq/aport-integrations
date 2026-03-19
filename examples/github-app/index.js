const { App } = require('octokit');
const axios = require('axios');

// Configuration
const CONFIG = {
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  aportApiKey: process.env.APORT_API_KEY,
  aportApiUrl: 'https://api.aport.io/verify',
};

// APort verification
async function verifyWithAPort(action, actor, context) {
  try {
    const response = await axios.post(CONFIG.aportApiUrl, {
      action,
      actor: {
        id: actor.login,
        name: actor.name || actor.login,
        owner: 'github'
      },
      context: { data: context },
      projectId: process.env.APORT_PROJECT_ID || 'default'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.aportApiKey}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('APort verification error:', error.message);
    return { allow: true, reasons: ['Verification failed, allowing by default'] };
  }
}

// Create GitHub App
const app = new App({
  appId: CONFIG.appId,
  privateKey: CONFIG.privateKey,
  webhooks: {
    secret: CONFIG.webhookSecret
  }
});

// Handle pull request events
app.on('pull_request.opened', async (context) => {
  const { pull_request, repository } = context.payload;
  
  const result = await verifyWithAPort(
    'pr_opened',
    pull_request.user,
    {
      repo: repository.full_name,
      pr_number: pull_request.number,
      title: pull_request.title,
      action: 'opened'
    }
  );
  
  if (!result.allow) {
    // Add labels or comment
    await context.octokit.issues.addLabels({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pull_request.number,
      labels: ['apot-verification-denied']
    });
    
    await context.octokit.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pull_request.number,
      body: `❌ APort Verification Denied\n\n${result.reasons.join('\n')}`
    });
  }
});

app.on('pull_request.synchronize', async (context) => {
  const { pull_request, repository } = context.payload;
  
  const result = await verifyWithAPort(
    'pr_updated',
    pull_request.user,
    {
      repo: repository.full_name,
      pr_number: pull_request.number,
      title: pull_request.title,
      action: 'synchronize'
    }
  );
  
  // Update check run
  const checkRun = await context.octokit.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    name: 'APort Verification',
    head_sha: pull_request.head.sha,
    status: 'completed',
    conclusion: result.allow ? 'success' : 'failure',
    output: {
      title: result.allow ? '✅ Allowed' : '❌ Denied',
      summary: result.allow 
        ? 'APort verification passed' 
        : `Verification denied: ${result.reasons.join(', ')}`
    }
  });
});

app.on('pull_request_review.submitted', async (context) => {
  const { pull_request, review, repository } = context.payload;
  
  if (review.state === 'approved' || review.state === 'changes_requested') {
    const result = await verifyWithAPort(
      'pr_review',
      review.user,
      {
        repo: repository.full_name,
        pr_number: pull_request.number,
        review_state: review.state
      }
    );
    
    if (!result.allow) {
      await context.octokit.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_request.number,
        body: `⚠️ APort Review Verification Warning\n\n${result.reasons.join('\n')}`
      });
    }
  }
});

// Handle merge attempt
app.on('pull_request.closed', async (context) => {
  const { pull_request, repository } = context.payload;
  
  if (pull_request.merged) {
    const result = await verifyWithAPort(
      'pr_merged',
      pull_request.merged_by,
      {
        repo: repository.full_name,
        pr_number: pull_request.number,
        title: pull_request.title,
        merge_commit_sha: pull_request.merge_commit_sha
      }
    );
    
    if (!result.allow) {
      // Try to revert the merge (requires write permissions)
      try {
        await context.octokit.repos.createCommitComment({
          owner: repository.owner.login,
          repo: repository.name,
          commit_sha: pull_request.merge_commit_sha,
          body: `⚠️ APort: Merge was flagged but proceeded. Reasons: ${result.reasons.join(', ')}`
        });
      } catch (e) {
        console.log('Could not add merge warning comment');
      }
    }
  }
});

// Health check endpoint
app.webhooks.on('ping', async (context) => {
  console.log('✅ APort GitHub App is running!');
});

// Start the app
async function start() {
  if (!CONFIG.appId || !CONFIG.privateKey) {
    console.error('Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY');
    process.exit(1);
  }
  
  await app.start();
  console.log('🤖 APort GitHub App is listening for events!');
}

start().catch(console.error);

module.exports = { app, verifyWithAPort };
