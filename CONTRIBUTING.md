# Contributing to qwik-custom-elements

## Package ownership boundaries

This monorepo has three publishable packages. Each has a strict ownership boundary.

### `@qwik-custom-elements/core`

Owns the adapter-agnostic generation pipeline:

- config loading and validation
- source discovery and path-safety checks
- CEM parsing into typed component metadata
- runtime-resolution orchestration and SSR capability coordination
- write planning and execution orchestration
- CLI entrypoints, summaries, and deterministic diagnostics

**Must not** own framework-specific generated output shape. Core must not branch on adapter identity to decide generated file content, filenames, exports, or fallback wrapper generation.

### `@qwik-custom-elements/adapter-stencil`

Owns Stencil-specific generation behavior:

- Stencil capability metadata
- Stencil SSR capability probing and SSR/CSR output contracts
- adapter-owned generated barrels, wrapper modules, and Stencil-specific runtime helper modules
- framework-specific output shape decisions

### `@qwik-custom-elements/adapter-lit`

Owns Lit-specific generation behavior:

- Lit capability metadata
- Lit SSR capability probing and SSR/CSR output contracts
- adapter-owned generated barrels, wrapper modules, and Lit-specific runtime helper modules
- framework-specific output shape decisions

The canonical Lit SSR subpath is `@qwik-custom-elements/adapter-lit/ssr`.

### Ownership change rule

When a change moves responsibility across the core/adapter boundary:

1. Add an ADR in `docs/adr/` (system-wide) or the affected package's `docs/adr/` (context-specific).
2. Update the affected `CONTEXT.md` if new domain terms are introduced.
3. Update the README files for all affected packages.

## Quality gates

All of the following must pass before a PR can be merged. They are enforced by CI.

| Gate                   | Command                                     | CI job                       |
| ---------------------- | ------------------------------------------- | ---------------------------- |
| Build                  | `pnpm build`                                | `quality`                    |
| Type check             | `pnpm typecheck`                            | `quality`                    |
| Tests                  | `pnpm test`                                 | `quality`                    |
| Lint                   | `pnpm lint`                                 | `quality`                    |
| Format                 | `pnpm format:check`                         | `quality`                    |
| Generated output drift | `pnpm generate` then `git diff --exit-code` | `drift-check`                |
| Compatibility matrix   | `pnpm compatibility:check`                  | `compatibility-matrix-check` |

Run all gates locally before pushing:

```bash
pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm format:check && pnpm compatibility:check
```

For generated output drift, run `pnpm generate` and commit any changed files under `apps/qwik-demo/src/generated/`.

## Release process

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing. All publishable packages (`core`, `adapter-stencil`, `adapter-lit`) are versioned independently.

### Workflow overview

1. **Add a changeset** alongside your PR whenever you make a user-facing change to a publishable package.
2. Once the PR is merged to `main`, the Release GitHub Action opens (or updates) a **"Version Packages" PR** that bumps `package.json` versions and writes CHANGELOG entries from your changeset files.
3. When you are ready to publish, merge the Version Packages PR. The Release workflow then runs `pnpm release` (builds all packages and calls `changeset publish`), creates GitHub Releases for each bumped package, and publishes to npm.

### Adding a changeset

Run this from the repo root:

```bash
pnpm changeset
```

The interactive CLI asks which packages are affected and what type of bump applies (patch / minor / major). It creates a file under `.changeset/` that should be committed with your PR.

**When to add a changeset:**

- Any user-facing change to `core`, `adapter-lit`, or `adapter-stencil` needs a changeset.
- Pure infrastructure changes (CI config, tooling, test helpers, demo app) do not.

**When not to add a changeset:**

- Changes only to `apps/qwik-demo`, `packages/test-lit-lib`, or `packages/test-stencil-lib`.
- Documentation-only changes that have no impact on package behavior.

### Versioning

This project follows [Semantic Versioning](https://semver.org/).

### Breaking changes

A breaking change is any change that:

- removes or renames a public export
- changes the shape or semantics of a public type or config field
- changes observable CLI or generator output in a way that requires consumer updates

Every breaking change **must**:

1. Include an explicit `BREAKING` section in the PR description and in the release notes. The section must describe what changed, what consumers must update, and why.
2. Update `COMPATIBILITY.md` before the PR is merged. The compatibility matrix row for the bumped package version must be added. CI (`compatibility-matrix-check`) enforces this: if the new package version is absent from `COMPATIBILITY.md`, CI fails.

Example PR description structure for a breaking change:

```
## Summary

<description of the change>

## BREAKING

- `ConfigSchema.source` is now required. Previously it defaulted to `{ type: 'CEM', path: 'custom-elements.json' }`.
- Update your `qwik-custom-elements.config.json` to include an explicit `source` field in every project entry.
```

### Non-breaking changes

Non-breaking changes (new features, bug fixes, internal refactors) do not require a `BREAKING` section, but still require all quality gates to pass.

### Pre-releases (alpha / beta / next)

To publish a pre-release channel:

```bash
# Enter pre-release mode (replace "beta" with "alpha", "next", etc.)
pnpm changeset pre enter beta

# Add changesets and merge PRs as normal — versions become e.g. 1.1.0-beta.0
# Packages are published to the "beta" npm dist-tag (not "latest")

# When ready to cut a stable release, exit pre-release mode
pnpm changeset pre exit

# Then add a final changeset and merge — a normal stable release is published
```

## Documentation expectations

Changes that alter core or adapter ownership boundaries must be reflected in:

- an ADR in `docs/adr/` (system-wide) or the affected package's `docs/adr/` (context-specific)
- the affected `CONTEXT.md` if new domain terms are introduced
- the package README files for any affected packages

Changes to the public API surface must be reflected in the relevant package README `## Current Exports` section.
