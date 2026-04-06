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

1. Query issues with state all.
2. Find child issues whose body has a Parent PRD section and references the parent issue number or URL.
3. Restrict to open child issues.
4. Parse each child issue Blocked by section for blocker issue numbers.
5. Keep only children where every blocker is closed.
6. Select the lowest issue number among unblocked open children.

If there is no unblocked open child issue, return no next issue.

## Procedure

1. Run the script:
   [select-next-child-issue.ps1](./scripts/select-next-child-issue.ps1)
2. Read JSON output.
3. Use next.number as the issue to implement.
4. If next is null, output ALL TASKS COMPLETE and stop.

## Command

Windows PowerShell:

powershell -File ./.github/skills/select-next-prd-issue/scripts/select-next-child-issue.ps1 -Repo DmitryEfimenko/qwik-custom-elements -ParentIssueNumber 1

PowerShell 7:

pwsh -File ./.github/skills/select-next-prd-issue/scripts/select-next-child-issue.ps1 -Repo DmitryEfimenko/qwik-custom-elements -ParentIssueNumber 1

## Output Contract

The script prints JSON with:

- parentIssueNumber
- openChildren
- unblockedOpenChildren
- next (object or null)

## Quality Checks

- Child detection only matches issues that explicitly declare Parent PRD linkage.
- Blocker evaluation is based on actual issue state from GitHub.
- Sorting is numeric ascending by issue number.
- Same input and same GitHub state yield same output.

## Notes

- Requires GitHub CLI authentication.
- This skill is workspace scoped and designed for repositories that model PRD parent and child issues with Parent PRD and Blocked by sections.
