---
name: select-next-prd-issue
description: 'Deterministically select the next PRD tracer-bullet issue using GitHub issue bodies and blocker states. Use when running PRD task workflows, choosing next issue, or replacing ad-hoc issue-selection scripts.'
argument-hint: 'owner/repo parent-issue-number'
---

# Deterministic PRD Next-Issue Selector

This skill standardizes how to pick the next child issue under a PRD parent issue.

It replaces ad-hoc issue-selection logic with one deterministic script so repeated runs produce the same result for the same issue state.

## When To Use

- Running a PRD task runner workflow
- User asks for next tracer bullet issue
- Need deterministic issue selection for CI or local automation
- Need to verify blocker graph before starting implementation

## Inputs

Required:

- Repository in owner/repo format
- Parent PRD issue number

Optional:

- Max issue fetch limit (default 200)

## Deterministic Selection Rules

1. Query issues with state all and label `prd-<parent-issue-number>`.
2. Find child issues whose body has a Parent PRD section containing exact URL `https://github.com/<owner>/<repo>/issues/<parent-issue-number>`.
3. Restrict to open child issues.
4. Parse each child issue Blocked by section using canonical dependency bullets only.
5. Resolve blocker states, including targeted lookups for blockers outside the initial query set.
6. Keep only children where every blocker is closed.
7. Select the lowest issue number among unblocked open children.

If there is no unblocked open child issue, return no next issue.

Canonical blocker format for new issues:

- `- Blocked by #<issue-number>: <short reason>`

## Procedure

1. Run the script:
   [select-next-child-issue.js](./scripts/select-next-child-issue.js)
2. Read JSON output.
3. Use next.number as the issue to implement.
4. If next is null, output ALL TASKS COMPLETE and stop.

The selector requires `gh` and `node`.

## Command

node ./.github/skills/select-next-prd-issue/scripts/select-next-child-issue.js --repo <repo> --parent-issue-number <number>

## Output Contract

The script prints JSON with:

- parentIssueNumber
- openChildren
- unblockedOpenChildren
- next (object or null)

## Quality Checks

- Child detection requires both matching PRD label and exact Parent PRD URL.
- Blocker evaluation is based on actual issue state from GitHub.
- Malformed `## Blocked by` lines fail the run; they are not ignored.
- Sorting is numeric ascending by issue number.
- Same input and same GitHub state yield same output.

## Notes

- Requires [GitHub CLI](https://cli.github.com/) authentication.
- Requires Node.js (available via `node --version`).
- External blocker states are resolved in parallel via `Promise.all`.
- This skill is workspace scoped and designed for repositories that model PRD parent and child issues with Parent PRD, Blocked by sections, and `prd-<number>` labels.
