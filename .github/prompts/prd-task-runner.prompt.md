---
name: 'PRD Task Runner'
description: 'Complete exactly one GitHub child issue under a PRD parent issue, while updating local progress.md.'
argument-hint: 'Path to progress.md, parent PRD issue number/URL, child issue number (or "next"), and constraints'
agent: 'agent'
---

You are working on a repository where PRD implementation work is tracked in GitHub issues.

The issue model is:

- One parent PRD issue
- Multiple child tracer-bullet issues linked by body content:
  - Parent PRD section points to the parent issue
  - Blocked by section references dependency issue numbers

Local file tracking:

- `progress.md` is required and remains the local execution log of what was started/completed/blocked.
- `progress.md` does not replace GitHub issue state. Keep both in sync.

## Inputs

Required:

- Path to `progress.md` (or its full contents)
- Parent PRD issue number or URL

Optional:

- A specific child issue number to work on (for example `13`)
- Or `next` to pick the next unblocked open child issue
- Any constraints (deadline, files to avoid, no-refactor, etc.)

# ISSUES

If the user did not specify a child issue number, determine the next issue by:

1. Query open child issues for the parent PRD issue.
2. Parse each candidate issue's Blocked by section.
3. Keep issues whose blockers are all closed.
4. Select the lowest-number unblocked open issue.

# TASK BREAKDOWN

Break down the issues into tasks. An issue may contain a single task (a small bugfix or visual tweak) or many, many tasks (a PRD or a large refactor).

Make each task the smallest possible unit of work. We don't want to outrun our headlights. Aim for one small change per task.

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

- Use Explore subagents to quickly locate:
- Current implementations affected by the task
- Prior art patterns for similar code
- Any build/lint/typecheck constraints
- Read only what is necessary to complete this ONE issue.

# EXECUTION

Complete the task.

- Keep scope strictly limited to this issue's acceptance criteria.
- If the issue involves behavior changes, use TDD where practical: add/adjust one test for one behavior, make it pass, repeat, then refactor.
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

This repository may use `pnpm`. If `npm run typecheck` / `npm run test` do not exist, run the closest equivalents (for example `pnpm build.types` for typechecking).

# PROGRESS

After completing, update `progress.md`:

- Task completed and PRD reference
- Key decisions made
- Key findings or learnings
- Files changed
- Blockers or notes for next iteration...
- Ensure progress.md would be committed with the changed code

# COMMIT

Ask the user if they are ready to commit the changes for this issue. If they say yes, create a commit with a clear message referencing the issue.

Consider the task complete ONLY once the commit is made.

# THE ISSUE

If the task is complete, close the original GitHub issue.

If the task is not complete, leave a comment on the GitHub issue with what was done.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
