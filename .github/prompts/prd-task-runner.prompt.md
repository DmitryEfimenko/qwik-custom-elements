---
name: 'PRD Task Runner'
description: 'Advance exactly one GitHub child issue under a PRD parent issue by one task, while updating the canonical local progress file.'
argument-hint: 'Parent PRD issue URL/number, child issue number (or "next"), and constraints. Progress path is inferred when possible.'
agent: 'agent'
---

You are working on a repository where PRD implementation work is tracked in GitHub issues.

The issue model is:

- One parent PRD issue
- Multiple child tracer-bullet issues linked by body content:
  - Child issues are labeled `prd-<parent-issue-number>`
  - Parent PRD section contains exact parent issue URL
  - Blocked by section uses explicit dependency bullets

Local file tracking:

- `.prd/progress/progress-for-prd-<parent-issue-number>.md` is the canonical local execution log for what was started, completed, or blocked.
- GitHub issues remain the source of truth for issue execution state. The progress file does not replace GitHub state.

## Inputs

Required:

- Parent PRD issue URL

Optional:

- Path to `.prd/progress/progress-for-prd-<number>.md`
- A specific child issue number to work on (for example `13`)
- Or `next` to pick the next unblocked open child issue
- Any constraints (deadline, files to avoid, no-refactor, etc.)

Progress file handling:

- Treat `.prd/progress/progress-for-prd-<parent-issue-number>.md` as required workflow input.
- If the path is not explicitly provided, infer it from the parent PRD issue number and continue.
- Stop and ask the user only when the parent issue number is unavailable or the progress file path cannot be inferred.

# ISSUES

If the user did not specify a child issue number, determine the next issue by:

Use skill: `../skills/select-next-prd-issue/SKILL.md` to run deterministic next-issue selection.

Do not re-implement selector logic in this prompt. The selector skill is the single source of truth for:

- How child issues are discovered
- How parent linkage is validated
- How blockers are parsed and evaluated
- How the next issue is selected deterministically

# TASK BREAKDOWN

Break down the issues into tasks. An issue may contain a single task (a small bugfix or visual tweak) or many, many tasks (a PRD or a large refactor).

Make each task the smallest possible unit of work. We don't want to outrun our headlights. Aim for one small change per task, and complete only one task from the selected child issue in a single run.

# TASK SELECTION

Pick the next task. Prioritize tasks in this order:

1. Critical bugfixes
2. Tracer bullets for new features

Tracer bullets comes from the Pragmatic Programmer. When building systems, you want to write code that gets you feedback as quickly as possible. Tracer bullets are small slices of functionality that go through all layers of the system, allowing you to test and validate your approach early. This helps in identifying potential issues and ensures that the overall architecture is sound before investing significant time in development.

TL;DR - build a tiny, end-to-end slice of the feature first, then expand it out.

1. Polish and quick wins
2. Refactors

If all tasks are complete, output "ALL TASKS COMPLETE" and stop. Do not start another issue.

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the issue.

- First, refresh canonical PRD decision context (do not rely on stale memory):
  - Re-read the current parent PRD issue body and extract only decisions relevant to this child issue/slice.
  - Re-read repository decision artifacts (for example `docs/qwik-custom-elements-decisions.md`, files under `docs/SYSTEM/*`) and treat PRD issue text as canonical for feature intent if conflicts exist.
  - If the selected child issue narrows or overrides wording, capture that as part of the decision context.
- Create a short "decision snapshot" before coding:
  - List the 3-7 highest-impact constraints that must hold for this slice.
  - Include explicit "must" and "must not" statements derived from PRD decisions.
  - Include contract-shape constraints (types/interfaces/config schema) when applicable.
- Use Explore subagents to quickly locate:
  - Current implementations affected by the task.
  - Prior art patterns for similar code.
  - Any build/lint/typecheck constraints.
  - Existing tests that should fail first for the selected behavior.
- Perform a pre-implementation decision check:
  - Compare the planned code change against the decision snapshot.
  - If any planned change conflicts with PRD decisions, revise the slice before editing code.
  - If decisions are ambiguous, pause and ask a clarifying question before implementation.
- Read only what is necessary to complete this ONE issue, but always include the latest PRD decision sources above.

# REQUIRED SKILL LOADING

Before writing code for the selected task, load relevant skills into context.

- Always load: `../skills/tdd/SKILL.md` when the task changes runtime behavior, output behavior, control flow, data flow, or adds/fixes logic.
- Also load: `../skills/tdd/SIFERS.md` when writing or updating tests.
- If the task is purely docs/formatting/scaffolding where TDD would be artificial, you may skip TDD skill loading.

# EXECUTION

Complete the task.

- Keep scope strictly limited to this issue's acceptance criteria.
- If the issue involves behavior changes, use TDD where practical: add/adjust one test for one behavior, make it pass, repeat, then refactor.
- For behavior-changing work, do not start implementation until `../skills/tdd/SKILL.md` has been loaded.
- If you find that the issue is larger than expected (for instance, requires a refactor first), output "HANG ON A SECOND".

Then, find a way to break it into a smaller chunk and only do that chunk (i.e. complete the smaller refactor).

## Testing Approach (Strong Preference)

When the selected issue involves changing runtime behavior or adding new behavior, strongly prefer a TDD workflow (red -> green -> refactor) and use the repository's SIFERS-style test structure (explicit `setup(options?)` per test file).

Reference:

- TDD skill: ../skills/tdd/SKILL.md
- SIFERS + setup pattern: ../skills/tdd/SIFERS.md

If the issue is purely documentation, formatting, scaffolding, or other work where TDD would be artificial, you may skip TDD, but still run the feedback loops.

# FEEDBACK LOOPS

Before considering the task complete, run the feedback loops:

- `npm run typecheck` to run the type checker
- `npm run test` to run the tests
- `npm run build` to run the build
- `npm run lint` to run the linter
- `npm run e2e` to run the root-level end-to-end suite

This repository may use `pnpm`. If `npm run typecheck` / `npm run test` do not exist, run the closest equivalents (for example `pnpm build.types` for typechecking).

# FORMATTING

Before committing, format all changed files.

- First try the repo-standard formatter command (for example `npm run format` or `pnpm format`) if it exists.
- If no project-wide formatter script exists, run a file-targeted formatter for only the changed files.
- Re-check git diff after formatting and include those formatting changes in the same commit.

# PROGRESS

After completing:

- update `.prd/progress/progress-for-prd-<number>.md`:
  - Task completed and PRD reference
  - Key decisions made
  - Key findings or learnings
  - Files changed
  - Blockers or notes for next iteration...
- use [sync-to-system-prd](../skills/sync-to-system-prd/SKILL.md) after every run to sync only durable decisions and findings to system-level documentation

# COMMIT

If the selected task resulted in code or docs changes, make a git commit with a clear message referencing the issue.

Use the format: `feat(<domain>): PRD-<parent-issue-number> #<child-issue-number> - <short description of the change>`.

# THE ISSUE

Only update the GitHub child issue after the task is complete, the progress file is updated, durable sync is done, and the commit is created.

Use this order:

1. Review the child issue body `## Acceptance criteria` section.
2. If the work completed in this run fully satisfies any unchecked acceptance-criteria item, edit the issue body and check those items. Do not check partial progress.
3. Post a comment with what was done, what remains, and any new blockers. Always post this comment, whether or not the issue will be closed.
4. If all acceptance criteria are now checked, close the original GitHub issue after posting the comment. Otherwise, leave it open.

Reference for GitHub CLI usage and PowerShell multiline comment safety:

- `../skills/gh-cli/SKILL.md`

When adding multiline close/comment text in PowerShell, use a here-string or `--body-file` approach. Do not rely on escaped newline sequences inside a single quoted command argument.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
