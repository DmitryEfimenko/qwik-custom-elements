import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8');
if (!input.trim()) {
  process.exit(0);
}

const lower = input.toLowerCase();
const hasGhIssueComment = /\bgh\s+issue\s+comment\b/.test(lower);
const hasBodyFlag = /(^|\s)--body(?:\s|=)/.test(lower);
const hasBodyFileFlag = /(^|\s)--body-file(?:\s|=)/.test(lower);
const hasEscapedNewline = /\\\\n/.test(input);

if (hasGhIssueComment && hasBodyFlag && !hasBodyFileFlag && hasEscapedNewline) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Use here-string or --body-file for multiline gh issue comments in PowerShell.',
    },
    systemMessage:
      'Blocked gh issue comment command: --body contains escaped \\\\n. Use a PowerShell here-string (@"..."@) or --body-file so GitHub receives real newlines.',
  };

  process.stdout.write(JSON.stringify(output));
}
