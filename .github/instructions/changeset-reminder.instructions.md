---
description: 'Reminds AI to create a changeset file for user-facing changes to publishable packages. Applies to all files under packages/core, packages/adapter-lit, and packages/adapter-stencil.'
name: 'Changeset Reminder'
applyTo: 'packages/core/**,packages/adapter-lit/**,packages/adapter-stencil/**'
---

# Changeset Required for Publishable Package Changes

Any user-facing change to `packages/core`, `packages/adapter-lit`, or `packages/adapter-stencil` requires a changeset file in `.changeset/`.

**User-facing** means: new or changed behavior, bug fix, new/removed/renamed export, config shape change, CLI output change.

**Not user-facing** (no changeset needed): pure internal refactor with no API impact, test-only changes, CI/tooling edits.

## Before committing

Invoke the `create-changeset` skill to write `.changeset/<descriptive-name>.md` and stage it alongside your other changes.

Reference: `.github/skills/create-changeset/SKILL.md`

## Quick reference: publishable packages

| Package                    | npm name                                |
| -------------------------- | --------------------------------------- |
| `packages/core`            | `@qwik-custom-elements/core`            |
| `packages/adapter-lit`     | `@qwik-custom-elements/adapter-lit`     |
| `packages/adapter-stencil` | `@qwik-custom-elements/adapter-stencil` |
