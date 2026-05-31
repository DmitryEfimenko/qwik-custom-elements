---
name: create-changeset
description: 'Create a Changesets file for user-facing changes to publishable packages. Use when a PR or commit touches core, adapter-lit, or adapter-stencil with user-facing impact. Writes .changeset/<id>.md directly — no interactive CLI needed.'
license: MIT
allowed-tools: Bash
---

# Create a Changeset

## Overview

A changeset is a markdown file with YAML front matter that records which publishable packages changed, what semver bump applies, and a human-readable changelog entry. It lives in `.changeset/` and is consumed by `pnpm changeset version` to bump `package.json` files and write CHANGELOGs.

This skill writes the changeset file directly. The interactive `pnpm changeset` CLI is not used.

## Publishable packages in this repo

| Package name                            | Workspace path             |
| --------------------------------------- | -------------------------- |
| `@qwik-custom-elements/core`            | `packages/core`            |
| `@qwik-custom-elements/adapter-lit`     | `packages/adapter-lit`     |
| `@qwik-custom-elements/adapter-stencil` | `packages/adapter-stencil` |

**Not publishable** (never need a changeset):

- `apps/qwik-demo`
- `packages/test-lit-lib`
- `packages/test-stencil-lib`
- Any CI config, tooling, or documentation-only change

## Bump type rules

| Bump    | When to use                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `major` | Removes or renames a public export; changes the shape or semantics of a public type, config field, or CLI flag; changes observable generator output in a way that requires consumer updates |
| `minor` | Adds a new public export, config field, or feature without breaking existing consumers                                                                                                      |
| `patch` | Bug fix, internal refactor, performance improvement, or documentation update that has no observable API impact                                                                              |

When in doubt, `patch` is safe. Prefer `minor` over `major` unless the change is truly breaking.

## Changeset file format

```
---
"@qwik-custom-elements/core": patch
"@qwik-custom-elements/adapter-lit": minor
---

Short description of what changed.

Optional extra detail: why the change was made and how consumers should update if needed.
```

Only include packages actually affected by the change in the YAML front matter.

## Filename

Use a short, descriptive kebab-case name derived from the change, 2–4 words. Examples:

- `fix-private-member-leak.md`
- `add-ssr-capability-probe.md`
- `remove-deprecated-source-field.md`

Avoid generic names like `fix.md` or `update.md`. The filename is not user-visible in changelogs — it only needs to be unique and identifiable within the PR.

Check existing files in `.changeset/` before picking a name to avoid collisions:

```bash
ls .changeset/*.md 2>/dev/null | grep -v README
```

## Workflow

### 1. Identify affected publishable packages

```bash
# Check staged changes
git diff --staged --name-only

# Fall back to unstaged if nothing staged
git diff --name-only
```

Map paths to packages:

- `packages/core/**` → `@qwik-custom-elements/core`
- `packages/adapter-lit/**` → `@qwik-custom-elements/adapter-lit`
- `packages/adapter-stencil/**` → `@qwik-custom-elements/adapter-stencil`

If no publishable package path appears in the diff, **do not create a changeset**. Stop and inform the user.

### 2. Determine bump type

Read the diff for each affected package:

```bash
git diff --staged packages/core/src/
```

Apply the bump type rules above. If the change touches only tests or internal implementation with no public API impact, use `patch`.

### 3. Decide: create or skip

**Create a changeset when:**

- A publishable package has a user-facing change (new behavior, bug fix, API change)

**Skip when:**

- Only `apps/`, `packages/test-*`, CI files, or docs changed
- A changeset for this exact change already exists in `.changeset/` (check via `git diff --staged .changeset/`)
- The user explicitly says "no changeset needed"

When the right action is ambiguous (e.g. a pure internal refactor with no API impact), ask: _"This looks like an internal refactor. Does it affect any public API or observable output? If not, I'll skip the changeset."_

### 4. Write the file

Construct the file content and write it:

```bash
cat > .changeset/<descriptive-name>.md << 'EOF'
---
"@qwik-custom-elements/core": patch
---

Fix: <short description of what was fixed and why>.
EOF
```

For multi-line descriptions, expand freely — the body is written to the CHANGELOG verbatim.

### 5. Stage the file

```bash
git add .changeset/<descriptive-name>.md
```

### 6. Verify

```bash
# Confirm the changeset is valid and recognized
rtk pnpm changeset status
```

If `changeset status` reports the new file, the changeset is ready to commit alongside the feature/fix changes.

## Examples

### Patch: bug fix in core

```markdown
---
'@qwik-custom-elements/core': patch
---

Fix: exclude private class members (those prefixed with `#`) from generated wrapper prop interfaces.
```

### Minor: new feature in adapter-lit

```markdown
---
'@qwik-custom-elements/adapter-lit': minor
---

Add SSR capability probing for Lit components. The adapter now detects whether `@lit-labs/ssr` is installed and
switches between SSR and CSR output contracts automatically.
```

### Major: breaking change in core

```markdown
---
'@qwik-custom-elements/core': major
---

`ConfigSchema.source` is now required. Previously it defaulted to `{ type: 'CEM', path: 'custom-elements.json' }`.

**Migration:** Add an explicit `source` field to every project entry in your `qwik-custom-elements.config.json`.
```

### Multiple packages

```markdown
---
'@qwik-custom-elements/core': minor
'@qwik-custom-elements/adapter-stencil': patch
---

Add `runtimeResolution` orchestration hook to core. Adapter-stencil updated to use the new hook instead of its
own internal resolution logic.
```

## Safety

- Never modify `.changeset/config.json`.
- Never run `pnpm changeset version` or `pnpm changeset publish` — those are release-pipeline operations.
- Never amend or delete an existing changeset file without explicit user request.
