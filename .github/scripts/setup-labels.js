#!/usr/bin/env node

/**
 * GitHub Labels Setup Script
 * 
 * This script creates a comprehensive set of labels for the repository.
 * Run with: node .github/scripts/setup-labels.js
 * 
 * Requires: GITHUB_TOKEN environment variable with repo scope
 */

const labels = [
  // Type labels
  { name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
  { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
  { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
  { name: 'duplicate', color: 'cfd3d7', description: 'This issue or pull request already exists' },
  { name: 'question', color: 'd876e3', description: 'Further information is requested' },
  { name: 'wontfix', color: 'ffffff', description: 'This will not be worked on' },
  { name: 'invalid', color: 'e4e669', description: 'This doesn\'t seem right' },
  
  // Priority labels
  { name: 'priority: critical', color: 'b60205', description: 'Critical priority - needs immediate attention' },
  { name: 'priority: high', color: 'ff0000', description: 'High priority' },
  { name: 'priority: medium', color: 'fbca04', description: 'Medium priority' },
  { name: 'priority: low', color: '0e8a16', description: 'Low priority' },
  
  // Status labels
  { name: 'status: blocked', color: 'd93f0b', description: 'Blocked by another issue or external factor' },
  { name: 'status: in-progress', color: '0052cc', description: 'Currently being worked on' },
  { name: 'status: needs-review', color: '5319e7', description: 'Needs review from maintainers' },
  { name: 'status: needs-info', color: 'D4C5F9', description: 'Needs more information' },
  { name: 'status: ready', color: '0e8a16', description: 'Ready to be worked on' },
  
  // Component labels
  { name: 'smart-contracts', color: 'F9D0C4', description: 'Related to Solidity smart contracts' },
  { name: 'frontend', color: 'C5DEF5', description: 'Related to React frontend' },
  { name: 'backend', color: 'BFDADC', description: 'Related to backend API' },
  { name: 'relayer', color: 'FEF2C0', description: 'Related to relayer service' },
  { name: 'ci-cd', color: '1d76db', description: 'Related to CI/CD workflows' },
  { name: 'dependencies', color: '0366d6', description: 'Related to dependencies' },
  { name: 'tests', color: 'C2E0C6', description: 'Related to testing' },
  
  // Security labels
  { name: 'security', color: 'ee0701', description: 'Security-related issue' },
  { name: 'vulnerability', color: 'ee0701', description: 'Security vulnerability' },
  
  // Team coordination
  { name: 'needs-discussion', color: '008672', description: 'Needs team discussion' },
  { name: 'quick-win', color: '7057ff', description: 'Quick task that can be done easily' },
  
  // Automation labels
  { name: 'needs-triage', color: 'fbca04', description: 'Needs to be triaged by maintainers' },
  { name: 'stale', color: 'ededed', description: 'Marked as stale due to inactivity' },
  { name: 'do-not-close', color: 'ffffff', description: 'Prevent stale bot from closing' },
  { name: 'pinned', color: 'c5def5', description: 'Pinned issue - won\'t be marked as stale' },
  
  // Size labels (for PRs)
  { name: 'size/XS', color: '00ff00', description: 'Extra small PR (< 20 lines)' },
  { name: 'size/S', color: '77ff00', description: 'Small PR (20-50 lines)' },
  { name: 'size/M', color: 'ffff00', description: 'Medium PR (50-200 lines)' },
  { name: 'size/L', color: 'ff9900', description: 'Large PR (200-500 lines)' },
  { name: 'size/XL', color: 'ff0000', description: 'Extra large PR (500-1000 lines)' },
  { name: 'size/XXL', color: '990000', description: 'Extremely large PR (> 1000 lines)' },
  
  // Breaking change
  { name: 'breaking-change', color: 'ee0701', description: 'Introduces breaking changes' },
  
  // Release labels
  { name: 'release', color: '0052cc', description: 'Related to releases' },
  { name: 'changelog', color: '0052cc', description: 'Should be mentioned in changelog' },
];

async function setupLabels() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || 'donateonchain-create/donateonchain';
  
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  const baseUrl = `https://api.github.com/repos/${owner}/${repoName}/labels`;
  
  console.log(`Setting up labels for ${owner}/${repoName}...\n`);
  
  for (const label of labels) {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(label),
      });
      
      if (response.ok) {
        console.log(`✓ Created label: ${label.name}`);
      } else if (response.status === 422) {
        // Label already exists, try to update it
        const updateResponse = await fetch(`${baseUrl}/${encodeURIComponent(label.name)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            color: label.color,
            description: label.description,
          }),
        });
        
        if (updateResponse.ok) {
          console.log(`↻ Updated label: ${label.name}`);
        } else {
          console.error(`✗ Failed to update label: ${label.name}`);
        }
      } else {
        console.error(`✗ Failed to create label: ${label.name} (${response.status})`);
      }
    } catch (error) {
      console.error(`✗ Error processing label ${label.name}:`, error.message);
    }
  }
  
  console.log('\nLabel setup complete!');
}

setupLabels().catch(console.error);
