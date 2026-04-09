---
name: 'sync-to-system-prd'
description: 'Consolidate one feature PRD run into canonical docs/SYSTEM artifacts when durable system-level information should be promoted.'
argument-hint: 'Parent PRD issue URL/number and/or progress file path, plus optional constraints and target sections. Infer progress path when possible.'
---

You are synchronizing durable decisions, findings, etc for the work completed into system-level documentation.

Canonical destination is `docs/SYSTEM/*`.

## Required Inputs

- Feature progress content from `.prd/progress/progress-for-prd-<number>.md`

## Optional Inputs

- Parent PRD issue URL or number (used to infer progress file path)
- Path to `.prd/progress/progress-for-prd-<number>.md`
- Specific source task or section focus
- Constraints (for example: no structural changes, docs-only)

Progress file handling:

- Progress content is required for sync.
- If the progress file path/content is not explicitly provided, infer `.prd/progress/progress-for-prd-<parent-issue-number>.md` from the parent PRD issue URL/number.
- Ask the user only if neither explicit progress input nor a parent issue identifier is available, or if path inference is impossible.

## Scope Of Sync

Sync only durable, cross-feature facts:

- User-facing API contracts
- User-facing UI behavior contracts
- Architectural decisions that apply beyond the feature
- Durable findings that reduce repeated mistakes

Do not sync temporary notes, implementation minutiae, or in-progress discussion.
There could be no findings to sync, and that's fine. Sync only what is valuable and durable.

## Output Targets

Update these files in `docs/SYSTEM/`:

- `prd.md` (system overview, active surfaces, roadmap)
- `api-contracts.md` (versioned contract registry)
- `decisions.md` (ADR-style decisions)
- `findings-log.md` (aggregated durable findings)

If any target file does not exist, create it.

## Backlink Rules

- Each system entry must link to source feature PRD.

## Findings Deduplication & Relevance

When syncing findings to `findings-log.md`:

1. **Search for overlaps**: Check existing findings for semantic duplicates or partial overlap
   - If a new finding subsumes or merges with an existing finding, consolidate them
   - Preserve both source feature PRD links in the consolidated entry
   - Update or remove the old entry if it becomes redundant
2. **Check relevance**: Evaluate whether each existing finding is still applicable
   - Remove obsolete findings if they're superseded by newer, more complete findings, or if the pattern no longer applies
   - Document removal reason (superseded by X, or no longer applicable) in the sync summary
3. **Apply dedup directly**: When overlap or obsolescence is detected, consolidate or remove findings in the same sync pass and report what changed in the final response

## Verification

Run lightweight checks before finalizing:

- Confirm links resolve
- Confirm no duplicate conflicting contract entries
- Confirm each promoted decision has a stable identifier
- **Confirm findings dedup**: No duplicate findings, no obsolete entries remain, each finding has clear source(s)

## Final Response Format

Provide:

1. Sync result (`Done` or `Blocked`)
2. Files updated
3. Promoted API/UI/decision/findings summary
4. Remaining risks or follow-up actions

## Final Rules

- Sync exactly one feature PRD per run.
- `prd-task-runner` may invoke this skill after every run, including runs that only complete part of a child issue.
- If a run produced no durable system-level change, leave `docs/SYSTEM/*` unchanged and report that explicitly.
- Do not execute implementation tasks in this prompt.
- Keep `docs/SYSTEM/*` concise and durable.
- **Findings are living knowledge**: Actively deduplicate and prune findings to prevent decay and false patterns.
- **Document finding lifecycle**: Mark findings with source feature PRD and date promoted.
