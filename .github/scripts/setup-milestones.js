#!/usr/bin/env node

/**
 * GitHub Milestones Setup Script
 * 
 * This script creates initial milestones for the repository.
 * Run with: node .github/scripts/setup-milestones.js
 * 
 * Requires: GITHUB_TOKEN environment variable with repo scope
 */

const milestones = [
  {
    title: 'v1.1.0 - Enhanced Features',
    description: `
## Goals
- Improve user experience
- Add new features based on community feedback
- Performance optimizations

## Key Features
- Advanced campaign filters
- Enhanced NFT metadata
- Improved analytics dashboard
- Better mobile experience
    `.trim(),
    due_on: null, // No due date initially
    state: 'open',
  },
  {
    title: 'v1.2.0 - Scaling & Performance',
    description: `
## Goals
- Optimize smart contract gas usage
- Improve frontend performance
- Scale backend infrastructure

## Key Features
- Gas optimization for contract methods
- Lazy loading and code splitting
- Database query optimization
- Caching layer implementation
    `.trim(),
    due_on: null,
    state: 'open',
  },
  {
    title: 'v2.0.0 - Major Upgrade',
    description: `
## Goals
- Introduce breaking changes for better architecture
- Multi-chain support
- Advanced governance features

## Key Features
- Cross-chain bridge integration
- DAO governance system
- Advanced campaign types
- Mobile app development
    `.trim(),
    due_on: null,
    state: 'open',
  },
  {
    title: 'Security Audit',
    description: `
## Goals
- Complete security audit of smart contracts
- Address all security findings
- Implement additional security measures

## Tasks
- Third-party security audit
- Fix identified vulnerabilities
- Update security documentation
- Implement additional monitoring
    `.trim(),
    due_on: null,
    state: 'open',
  },
  {
    title: 'Documentation Improvements',
    description: `
## Goals
- Comprehensive documentation for all components
- Video tutorials and guides
- API documentation
- Developer onboarding materials

## Deliverables
- Updated README and guides
- API reference documentation
- Video tutorials
- Architecture diagrams
- Contributing guides
    `.trim(),
    due_on: null,
    state: 'open',
  },
  {
    title: 'Community & Growth',
    description: `
## Goals
- Grow the community
- Increase adoption
- Partner with NGOs

## Activities
- Community outreach
- Partnership development
- Marketing campaigns
- Hackathons and events
- Social media presence
    `.trim(),
    due_on: null,
    state: 'open',
  },
];

async function setupMilestones() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || 'donateonchain-create/donateonchain';
  
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  const [owner, repoName] = repo.split('/');
  const baseUrl = `https://api.github.com/repos/${owner}/${repoName}/milestones`;
  
  console.log(`Setting up milestones for ${owner}/${repoName}...\n`);
  
  for (const milestone of milestones) {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(milestone),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Created milestone: ${milestone.title}`);
        console.log(`  URL: ${data.html_url}`);
      } else if (response.status === 422) {
        console.log(`⚠ Milestone already exists: ${milestone.title}`);
      } else {
        const error = await response.text();
        console.error(`✗ Failed to create milestone: ${milestone.title} (${response.status})`);
        console.error(`  Error: ${error}`);
      }
    } catch (error) {
      console.error(`✗ Error processing milestone ${milestone.title}:`, error.message);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('Milestone setup complete!');
}

setupMilestones().catch(console.error);
