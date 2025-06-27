const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const REPORT_PATH = path.resolve(__dirname, '../compliance-report.json');

function getFailingTests(results) {
  return results.filter(r => r.status === 'failed');
}

function formatFailingTests(failing) {
  if (failing.length === 0) return '✅ All tests passed!';
  return failing.map(f => `- **${f.name}** (${f.path})`).join('\n');
}

async function postComment(body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.GITHUB_PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !pr || !token) {
    console.error('Missing GitHub environment variables.');
    process.exit(1);
  }
  const url = `https://api.github.com/repos/${repo}/issues/${pr}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ body })
  });
  if (!res.ok) {
    console.error('Failed to post comment:', await res.text());
    process.exit(1);
  }
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Compliance report not found:', REPORT_PATH);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const total = report.passed + report.failed;
  const percent = total === 0 ? 0 : Math.round((report.passed / total) * 100);
  const failing = getFailingTests(report.results);
  const body = `### 🛡️ TokenScript Compliance Suite\n\n**Passing:** ${report.passed}/${total} (${percent}%)\n\n**Failing tests:**\n${formatFailingTests(failing)}`;
  console.log(body);
  postComment(body).catch(e => {
    console.error('Error posting comment:', e);
    process.exit(1);
  });
}

main();

