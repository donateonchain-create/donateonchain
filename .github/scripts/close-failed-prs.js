#!/usr/bin/env node

/**
 * Close Failed PRs Script
 * 
 * This script identifies and closes open pull requests that have failed CI checks.
 * Run with: node .github/scripts/close-failed-prs.js
 * 
 * Requires: GITHUB_TOKEN environment variable with repo scope
 * 
 * Options:
 *   --dry-run    Show which PRs would be closed without actually closing them
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function getOpenPRs(owner, repoName, token) {
  const url = `https://api.github.com/repos/${owner}/${repoName}/pulls?state=open&per_page=100`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch PRs: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function getWorkflowRunsForPR(owner, repoName, token, headSha) {
  const url = `https://api.github.com/repos/${owner}/${repoName}/commits/${headSha}/check-runs`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    // If we can't get check runs, try getting the combined status
    return null;
  }
  
  return await response.json();
}

async function getCombinedStatus(owner, repoName, token, headSha) {
  const url = `https://api.github.com/repos/${owner}/${repoName}/commits/${headSha}/status`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    return null;
  }
  
  return await response.json();
}

function hasFailedChecks(checkRuns, combinedStatus) {
  // Check check-runs (GitHub Actions)
  if (checkRuns && checkRuns.check_runs) {
    const failedChecks = checkRuns.check_runs.filter(
      run => run.conclusion === 'failure' || run.conclusion === 'cancelled'
    );
    if (failedChecks.length > 0) {
      return { failed: true, source: 'check-runs', details: failedChecks };
    }
  }
  
  // Check combined status (legacy CI systems)
  if (combinedStatus && combinedStatus.state === 'failure') {
    return { failed: true, source: 'status', details: combinedStatus.statuses };
  }
  
  return { failed: false };
}

async function closePR(owner, repoName, token, prNumber, reason) {
  if (DRY_RUN) {
    return { success: true, dryRun: true };
  }
  
  // First, add a comment explaining why the PR is being closed
  const commentUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${prNumber}/comments`;
  await fetch(commentUrl, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      body: `🤖 This pull request is being automatically closed because it has failed CI checks.\n\n${reason}\n\nIf you believe this was done in error, please reopen the PR and investigate the failures.`,
    }),
  });
  
  // Then close the PR
  const url = `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      state: 'closed',
    }),
  });
  
  return {
    success: response.ok,
    status: response.status,
  };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || 'donateonchain-create/donateonchain';
  
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  
  console.log(`Checking failed PRs for ${owner}/${repoName}...`);
  if (DRY_RUN) {
    console.log('🔍 Running in DRY RUN mode - no PRs will be closed\n');
  }
  console.log();
  
  try {
    // Get all open PRs
    const prs = await getOpenPRs(owner, repoName, token);
    console.log(`Found ${prs.length} open pull requests\n`);
    
    let closedCount = 0;
    let skippedCount = 0;
    
    for (const pr of prs) {
      const prNumber = pr.number;
      const headSha = pr.head.sha;
      
      console.log(`Checking PR #${prNumber}: ${pr.title}`);
      
      // Get check runs and combined status
      const checkRuns = await getWorkflowRunsForPR(owner, repoName, token, headSha);
      const combinedStatus = await getCombinedStatus(owner, repoName, token, headSha);
      
      const failureInfo = hasFailedChecks(checkRuns, combinedStatus);
      
      if (failureInfo.failed) {
        console.log(`  ❌ Has failed checks (${failureInfo.source})`);
        
        let reason = 'Failed checks detected:';
        if (failureInfo.source === 'check-runs') {
          reason += '\n' + failureInfo.details.map(check => 
            `- ${check.name}: ${check.conclusion}`
          ).join('\n');
        } else {
          reason += '\n' + failureInfo.details.filter(s => s.state === 'failure').map(status => 
            `- ${status.context}: ${status.state}`
          ).join('\n');
        }
        
        const result = await closePR(owner, repoName, token, prNumber, reason);
        
        if (result.success) {
          if (result.dryRun) {
            console.log(`  🔍 [DRY RUN] Would close PR #${prNumber}`);
          } else {
            console.log(`  ✓ Closed PR #${prNumber}`);
          }
          closedCount++;
        } else {
          console.log(`  ✗ Failed to close PR #${prNumber} (status: ${result.status})`);
        }
      } else {
        console.log(`  ✓ No failed checks`);
        skippedCount++;
      }
      
      console.log();
    }
    
    console.log('Summary:');
    console.log(`  Total PRs checked: ${prs.length}`);
    if (DRY_RUN) {
      console.log(`  PRs that would be closed: ${closedCount}`);
    } else {
      console.log(`  PRs closed: ${closedCount}`);
    }
    console.log(`  PRs skipped (passing): ${skippedCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
