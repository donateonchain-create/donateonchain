#!/usr/bin/env node

/**
 * GitHub Token Tester
 * Tests if your GitHub token has the correct permissions
 */

const https = require('https');

// Get token from environment variable
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.error('❌ Error: GITHUB_TOKEN environment variable not set');
    console.log('\nUsage:');
    console.log('  export GITHUB_TOKEN=your_token_here');
    console.log('  node .github/scripts/test-token.js');
    process.exit(1);
}

// Determine token type
const tokenType = GITHUB_TOKEN.startsWith('ghp_') ? 'Classic' :
    GITHUB_TOKEN.startsWith('github_pat_') ? 'Fine-grained' :
        'Unknown';

console.log('🔍 Testing GitHub Token...\n');
console.log(`Token Type: ${tokenType}`);
console.log(`Token Preview: ${GITHUB_TOKEN.substring(0, 20)}...`);
console.log('─'.repeat(60));

// Test functions
async function makeRequest(url, description) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'DonateOnChain-Setup-Script',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    const tests = [
        {
            name: 'User Authentication',
            url: 'https://api.github.com/user',
            check: (res) => res.status === 200 && res.data.login,
            required: true
        },
        {
            name: 'Repository Access',
            url: 'https://api.github.com/repos/donateonchain-create/donateonchain',
            check: (res) => res.status === 200,
            required: true
        },
        {
            name: 'Issues Permission',
            url: 'https://api.github.com/repos/donateonchain-create/donateonchain/labels',
            check: (res) => res.status === 200,
            required: true
        },
        {
            name: 'Milestones Permission',
            url: 'https://api.github.com/repos/donateonchain-create/donateonchain/milestones',
            check: (res) => res.status === 200,
            required: true
        }
    ];

    let allPassed = true;
    const results = [];

    for (const test of tests) {
        try {
            console.log(`\n📋 Testing: ${test.name}`);
            const result = await makeRequest(test.url, test.name);
            const passed = test.check(result);

            if (passed) {
                console.log(`   ✅ PASSED (Status: ${result.status})`);
                if (test.name === 'User Authentication' && result.data.login) {
                    console.log(`   👤 Authenticated as: ${result.data.login}`);
                }
                if (test.name === 'Repository Access' && result.data.name) {
                    console.log(`   📦 Repository: ${result.data.full_name}`);
                    console.log(`   🔒 Private: ${result.data.private}`);
                }
            } else {
                console.log(`   ❌ FAILED (Status: ${result.status})`);
                if (result.data.message) {
                    console.log(`   📝 Message: ${result.data.message}`);
                }
                if (test.required) {
                    allPassed = false;
                }
            }

            results.push({ test: test.name, passed, status: result.status });
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`);
            results.push({ test: test.name, passed: false, error: error.message });
            if (test.required) {
                allPassed = false;
            }
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`\nTests Passed: ${passed}/${total}`);

    if (allPassed) {
        console.log('\n✅ SUCCESS! Your token has all required permissions.');
        console.log('\nYou can now run:');
        console.log('  node .github/scripts/setup-labels.js');
        console.log('  node .github/scripts/setup-milestones.js');
    } else {
        console.log('\n❌ FAILED! Your token is missing required permissions.');
        console.log('\n🔧 Troubleshooting:');

        const failedTests = results.filter(r => !r.passed);

        if (failedTests.some(t => t.test === 'Repository Access')) {
            console.log('\n1. Repository Access Failed:');
            console.log('   - If using fine-grained token: Grant organization access');
            console.log('   - Go to: https://github.com/settings/personal-access-tokens');
            console.log('   - Request access to donateonchain-create organization');
            console.log('   - OR use a Classic token instead');
        }

        if (failedTests.some(t => t.test === 'Issues Permission' || t.test === 'Milestones Permission')) {
            console.log('\n2. Missing Permissions:');
            console.log('   - Classic token: Ensure "repo" scope is checked');
            console.log('   - Fine-grained token: Ensure these permissions:');
            console.log('     • Issues: Read and write');
            console.log('     • Administration: Read and write');
        }
    }

    console.log('\n');
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
});
