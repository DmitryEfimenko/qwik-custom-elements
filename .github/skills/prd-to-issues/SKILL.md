---
name: prd-to-issues
description: Break a PRD into independently-grabbable GitHub issues using tracer-bullet vertical slices. Use when user wants to convert a PRD to issues, create implementation tickets, or break down a PRD into work items.

---

# PRD to Issues

Break a PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD

Ask the user for the PRD GitHub issue number (or URL).

If the PRD is not already in your context window, fetch it with `gh issue view <number>` (with comments).

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Tracer bullets comes from the Pragmatic Programmer. When building systems, you want to write code that gets you feedback as quickly as possible. Tracer bullets are small slices of functionality that go through all layers of the system, allowing you to test and validate your approach early. This helps in identifying potential problems and ensures that the overall architecture is sound before investing significant time in development.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Create the GitHub issues

For each approved slice, create a GitHub issue using `gh issue create`. Use the issue body template below.

Create issues in dependency order (blockers first) so you can reference real issue numbers in the "Blocked by" field.

Use this issue title convention unless the user specifies otherwise: [PRD-<prd-issue-number>] - <slice title>.

When creating each child issue, add label `prd-<prd-issue-number>` so downstream tooling can deterministically scope children to one PRD.

Example:

`gh issue create --title "[PRD-12] - Add login shell" --label "prd-12" --body-file /tmp/issue.md`


<issue-template>
## Parent PRD

https://github.com/<owner>/<repo>/issues/<prd-issue-number>

This URL is required. Number-only references are intentionally unsupported.

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number>: <short reason> (if any)

Or "None - can start immediately" if no blockers.

Only explicit bullet dependencies are valid blockers. Incidental # references in prose are not treated as blockers by the selector.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

### Blocker formatting rules

- Use one blocker per bullet.
- Use canonical format:
	- `- Blocked by #<issue-number>: <short reason>`
- Do not mix blocker declarations with explanatory prose in the same line.

Do NOT close or modify the parent PRD issue.

### 6. Create progress.md

Create a file in the `.prd/progress` directory. Name the file `progress-for-prd-<number>.md` where `<number>` is the original PRD issue number. This is the canonical local progress file consumed by `prd-task-runner` and `sync-to-system-prd`.
