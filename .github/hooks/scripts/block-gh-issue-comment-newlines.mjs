import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8');
if (!input.trim()) {
  process.exit(0);
}

function extractCandidateText(rawInput) {
  const candidates = [rawInput];

  try {
    const payload = JSON.parse(rawInput);
    const possibleStrings = [
      payload?.toolInput?.command,
      payload?.tool_input?.command,
      payload?.tool?.input?.command,
      payload?.toolUse?.input?.command,
      payload?.command,
    ];

    for (const value of possibleStrings) {
      if (typeof value === 'string' && value.trim().length > 0) {
        candidates.push(value);
      }
    }
  } catch {
    // Ignore JSON parsing errors and fall back to raw stdin text.
  }

  return candidates.join('\n');
}

const candidateText = extractCandidateText(input);
const lower = candidateText.toLowerCase();
const hasEscapedNewline = /\\n/.test(candidateText);

const hasGhIssueComment = /\bgh\s+issue\s+comment\b/.test(lower);
const hasBodyFlag = /(^|\s)--body(?:\s|=)/.test(lower);
const hasBodyFileFlag = /(^|\s)--body-file(?:\s|=)/.test(lower);
const hasUnsafeIssueCommentBody =
  hasGhIssueComment && hasBodyFlag && !hasBodyFileFlag && hasEscapedNewline;

const hasGhIssueClose = /\bgh\s+issue\s+close\b/.test(lower);
const hasCommentFlag = /(^|\s)--comment(?:\s|=)/.test(lower);
const hasUnsafeIssueCloseComment =
  hasGhIssueClose && hasCommentFlag && hasEscapedNewline;

if (hasUnsafeIssueCommentBody || hasUnsafeIssueCloseComment) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Use here-string or --body-file for multiline gh issue comments in PowerShell.',
    },
    systemMessage:
      'Blocked gh issue command: detected escaped \\n in --body/--comment. Use a PowerShell here-string (@"..."@) or --body-file so GitHub receives real newlines.',
  };

  process.stdout.write(JSON.stringify(output));
}
