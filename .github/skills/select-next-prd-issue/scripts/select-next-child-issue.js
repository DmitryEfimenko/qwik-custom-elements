#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BLOCKER_PATTERN = /^[-*]\s+Blocked\s+by\s+#(\d+)(\s|:|$)/;
const NONE_PATTERN = /^None\s*-\s*can\s+start\s+immediately$/;

function extractSection(body, headingPattern) {
  const headingRe = new RegExp('^\\s*##\\s*' + headingPattern + '\\s*$', 'i');
  const nextSectionRe = /^\s*##\s+/;
  const lines = body.split('\n');
  const result = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (headingRe.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && nextSectionRe.test(line)) {
      break;
    }
    if (inSection) {
      result.push(line);
    }
  }

  return result.join('\n');
}

function extractBlockerNumbers(content) {
  const seen = new Set();
  const numbers = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const match = BLOCKER_PATTERN.exec(trimmed);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!seen.has(n)) {
        seen.add(n);
        numbers.push(n);
      }
    }
  }

  return numbers.sort((a, b) => a - b);
}

function validateBlockedBySection(content, issueNumber) {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (NONE_PATTERN.test(trimmed)) continue;
    if (BLOCKER_PATTERN.test(trimmed)) continue;

    throw new Error(
      `Error: issue #${issueNumber} has invalid Blocked by line: ${trimmed}\n` +
        'Expected format: - Blocked by #<issue-number>: <short reason>',
    );
  }
}

function parseGitHubIssueNumberFromUrl(url) {
  const match =
    /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/(\d+)(?:[/?#].*)?$/i.exec(
      url.trim(),
    );
  if (!match) return null;
  return parseInt(match[1], 10);
}

function hasMatchingParentReference(parentSection, parentUrl, parentIssueNum) {
  const lines = parentSection
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line === parentUrl) {
      return true;
    }

    const directIssueNum = parseGitHubIssueNumberFromUrl(line);
    if (directIssueNum === parentIssueNum) {
      return true;
    }

    const markdownLinkMatch = /\((https:\/\/github\.com\/[^)]+)\)/i.exec(line);
    if (markdownLinkMatch) {
      const markdownIssueNum = parseGitHubIssueNumberFromUrl(
        markdownLinkMatch[1],
      );
      if (markdownIssueNum === parentIssueNum) {
        return true;
      }
    }
  }

  return false;
}

function ghSync(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', stdio: 'pipe' });
  if (result.error) throw result.error;
  return result;
}

function fetchBlockerState(repo, number) {
  return new Promise((resolve) => {
    const child = spawn('gh', [
      'issue',
      'view',
      String(number),
      '--repo',
      repo,
      '--json',
      'state,number',
    ]);

    let stdout = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });
    child.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout).state);
        } catch {
          resolve('MISSING');
        }
      } else {
        resolve('MISSING');
      }
    });
    child.on('error', () => resolve('MISSING'));
  });
}

function usage() {
  return `Usage:
  select-next-child-issue.js --repo <owner/repo> --parent-issue-number <number> [--limit <n>]

Options:
  --repo, -r                  Repository in owner/repo format
  --parent-issue-number, -p   Parent PRD issue number
  --limit, -l                 Max labeled issues to fetch (default: 200)
  --help, -h                  Show this help`;
}

async function main(argv) {
  let repo = '';
  let parentIssueNumber = '';
  let limit = '200';

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--repo':
      case '-r':
        repo = args[++i] ?? '';
        break;
      case '--parent-issue-number':
      case '-p':
        parentIssueNumber = args[++i] ?? '';
        break;
      case '--limit':
      case '-l':
        limit = args[++i] ?? '';
        break;
      case '--help':
      case '-h':
        process.stdout.write(usage() + '\n');
        process.exit(0);
        break;
      default:
        process.stderr.write(
          `Error: unknown argument: ${args[i]}\n${usage()}\n`,
        );
        process.exit(1);
    }
  }

  if (!repo || !parentIssueNumber) {
    process.stderr.write(
      `Error: --repo and --parent-issue-number are required\n${usage()}\n`,
    );
    process.exit(1);
  }

  if (!/^\d+$/.test(parentIssueNumber)) {
    process.stderr.write('Error: --parent-issue-number must be an integer\n');
    process.exit(1);
  }

  if (!/^\d+$/.test(limit)) {
    process.stderr.write('Error: --limit must be an integer\n');
    process.exit(1);
  }

  const authCheck = ghSync(['auth', 'status']);
  if (authCheck.status !== 0) {
    process.stderr.write(
      'Error: gh is not authenticated. Run: gh auth login\n',
    );
    process.exit(1);
  }

  const parentIssueNum = parseInt(parentIssueNumber, 10);
  const parentUrl = `https://github.com/${repo}/issues/${parentIssueNum}`;
  const label = `prd-${parentIssueNum}`;

  const listResult = ghSync([
    'issue',
    'list',
    '--repo',
    repo,
    '--state',
    'all',
    '--label',
    label,
    '--limit',
    limit,
    '--json',
    'number,title,state,body,url',
  ]);

  let rawIssues = [];
  if (listResult.status === 0 && listResult.stdout.trim()) {
    rawIssues = JSON.parse(listResult.stdout);
  }

  const issueStateMap = {};
  for (const issue of rawIssues) {
    issueStateMap[String(issue.number)] = issue.state;
  }

  const children = [];
  for (const issue of rawIssues) {
    if (issue.number === parentIssueNum) continue;

    const body = issue.body ?? '';
    const parentSection = extractSection(body, 'Parent\\s*PRD');
    const hasParentUrl = hasMatchingParentReference(
      parentSection,
      parentUrl,
      parentIssueNum,
    );

    if (!hasParentUrl) continue;

    const blockedBySection = extractSection(body, 'Blocked\\s*by');
    validateBlockedBySection(blockedBySection, issue.number);
    const blockerNumbers = extractBlockerNumbers(blockedBySection);

    children.push({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.url,
      blockerNumbers,
    });
  }

  const allBlockerNumbers = [
    ...new Set(children.flatMap((c) => c.blockerNumbers)),
  ];
  const externalBlockers = allBlockerNumbers.filter(
    (n) => !(String(n) in issueStateMap),
  );

  if (externalBlockers.length > 0) {
    const states = await Promise.all(
      externalBlockers.map((n) => fetchBlockerState(repo, n)),
    );
    for (let i = 0; i < externalBlockers.length; i++) {
      issueStateMap[String(externalBlockers[i])] = states[i];
    }
  }

  const childrenWithStatus = children.map((child) => ({
    ...child,
    blockerStates: child.blockerNumbers.map((n) => ({
      number: n,
      state: issueStateMap[String(n)] ?? 'MISSING',
    })),
    unblocked: child.blockerNumbers.every(
      (n) => (issueStateMap[String(n)] ?? 'MISSING') === 'CLOSED',
    ),
  }));

  const openChildren = childrenWithStatus
    .filter((c) => c.state === 'OPEN')
    .sort((a, b) => a.number - b.number);

  const unblockedOpenChildren = openChildren.filter((c) => c.unblocked);
  const next = unblockedOpenChildren[0] ?? null;

  const result = {
    parentIssueNumber: parentIssueNum,
    openChildren,
    unblockedOpenChildren,
    next,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(next === null ? 2 : 0);
}

function isMainModule() {
  return (
    Boolean(process.argv[1]) &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  main(process.argv).catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}

export {
  extractBlockerNumbers,
  extractSection,
  hasMatchingParentReference,
  parseGitHubIssueNumberFromUrl,
  validateBlockedBySection,
};
