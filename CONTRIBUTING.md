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

1. Update `docs/SYSTEM/decisions.md` with a dated decision record.
2. Update `docs/SYSTEM/findings-log.md` with the rationale.
3. Update the README files for all affected packages.

## Quality gates

All of the following must pass before a PR can be merged. They are enforced by CI.

| Gate | Command | CI job |
|---|---|---|
| Build | `pnpm build` | `quality` |
| Type check | `pnpm typecheck` | `quality` |
| Tests | `pnpm test` | `quality` |
| Lint | `pnpm lint` | `quality` |
| Format | `pnpm format:check` | `quality` |
| Generated output drift | `pnpm generate` then `git diff --exit-code` | `drift-check` |
| Compatibility matrix | `pnpm compatibility:check` | `compatibility-matrix-check` |

Run all gates locally before pushing:

```bash
pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm format:check && pnpm compatibility:check
```

For generated output drift, run `pnpm generate` and commit any changed files under `apps/qwik-demo/src/generated/`.

## Release process

### Versioning

This project follows [Semantic Versioning](https://semver.org/). All publishable packages (`core`, `adapter-stencil`, `adapter-lit`) are versioned independently.

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

## Documentation expectations

Changes that alter core or adapter ownership boundaries must be reflected in:

- `docs/SYSTEM/decisions.md`
- `docs/SYSTEM/findings-log.md`
- the package README files for any affected packages

Changes to the public API surface must be reflected in the relevant package README `## Current Exports` section.
