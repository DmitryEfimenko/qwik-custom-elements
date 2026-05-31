---
name: 'sync-to-system-prd'
description: 'Consolidate one feature PRD run into canonical CONTEXT.md and ADR artifacts when durable system-level information should be promoted.'
argument-hint: 'Parent PRD issue URL/number and/or progress file path, plus optional constraints and target sections. Infer progress path when possible.'
---

You are synchronizing durable decisions and domain terms from a completed feature PRD run into the repository's multi-context documentation.

Canonical destinations are per-package `CONTEXT.md` files and `docs/adr/` directories.

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

- New domain terms introduced into a package's vocabulary
- Architectural decisions that apply beyond the feature
- Clarifications to existing CONTEXT.md terms (update in place)

Do not sync temporary notes, implementation minutiae, in-progress discussion, or findings that are only relevant to the specific feature run.
There could be no findings to sync, and that's fine. Sync only what is valuable and durable.

## Output Targets

### New domain terms → `CONTEXT.md`

Add new terms to the affected package's `CONTEXT.md` under `## Language`. If the term spans multiple packages, add it to each relevant `CONTEXT.md`. Follow the term format in [CONTEXT-FORMAT.md](../grill-with-docs/CONTEXT-FORMAT.md).

Do not add general programming concepts. Only terms specific to this project's domain.

### Qualifying decisions → `docs/adr/`

Apply the ADR three-criteria gate defined in [grill-with-docs](../grill-with-docs/SKILL.md) before promoting any decision. If all three criteria hold, determine scope:

- **Cross-cutting** (spans `packages/core` + one or more adapters): write to `docs/adr/`
- **Package-specific** (scoped to one adapter or core alone): write to `packages/{name}/docs/adr/`

Scan the target `docs/adr/` for the highest existing number and increment by one. ADR body is 1–3 sentences: context, decision, reason. No sections needed unless consequences are non-obvious.

## Backlink Rules

- Each ADR must include a reference to the source feature PRD issue URL.

## Deduplication

Before adding a new term or ADR, check existing `CONTEXT.md` and `docs/adr/` files for semantic duplicates or partial overlap. Consolidate rather than duplicate.

## Verification

Run lightweight checks before finalizing:

- Confirm ADR numbering is sequential with no gaps or conflicts
- Confirm no duplicate or conflicting term definitions across context files
- Confirm each promoted ADR has a source issue backlink
- Confirm `CONTEXT-MAP.md` at the repo root still accurately lists all context paths

## Final Response Format

Provide:

1. Sync result (`Done` or `Blocked`)
2. Files updated or created
3. Promoted terms and ADR summary
4. Remaining risks or follow-up actions

## Final Rules

- Sync exactly one feature PRD per run.
- `prd-task-runner` may invoke this skill after every run, including runs that only complete part of a child issue.
- If a run produced no durable system-level change, leave all context files unchanged and report that explicitly.
- Do not execute implementation tasks in this prompt.
- Follow `CONTEXT.md` and ADR format conventions from [grill-with-docs](../grill-with-docs/SKILL.md).
