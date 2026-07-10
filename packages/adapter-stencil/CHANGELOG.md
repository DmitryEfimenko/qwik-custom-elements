# @qwik-custom-elements/adapter-stencil

## 1.0.3

### Patch Changes

- ea0f65a: Fix Stencil client setup timing by listening to `readystatechange` instead of only `load`. This ensures setup hooks run reliably when wrappers mount after initial load timing has advanced, while still executing setup exactly once.
- 4eb4a89: Prevent client builds from bundling Stencil hydrate runtime when SSR wrappers are generated.

  The generated SSR bridge now computes the hydrate import specifier at runtime and keeps `/* @vite-ignore */` on the dynamic import. This avoids Vite statically resolving Node-only hydrate dependencies (such as `stream`) into browser bundles while preserving SSR behavior.

- ea0f65a: Generate Stencil SSR runtime bridges with a direct dynamic hydrate import instead of the Vite-ignored indirection. This allows SSR bundlers to include hydrate runtime code reliably and avoids request-time module resolution failures in dist preview/server layouts.
- ea0f65a: Fix Stencil SSR wrapper publishing by moving the SSR bridge back into the adapter runtime and publishing adapter-stencil subpaths as Qwik library entries. Generated Stencil SSR runtime files now stay thin and consume `createStencilSSRBridgeComponent` from the adapter package. The SSR bridge now also renders the custom-element host during hydration so Stencil-rendered output is not replaced by bare slot text on the client.

  Publish adapter-stencil with inline Qwik entry output so consuming Qwik apps do not resolve package QRL chunks back to missing source-parent files.

  Fix the core CLI entrypoint so pnpm-linked binaries execute correctly through symlinked `node_modules/.bin` paths, and resolve adapter SSR probe imports from the consuming project so linked adapters can still detect project-local hydrate runtimes.

- Updated dependencies [ea0f65a]
- Updated dependencies [ea0f65a]
  - @qwik-custom-elements/core@1.0.3

## 1.0.2

### Patch Changes

- 02f4e57: Add npm metadata fields to fix provenance validation and improve package discoverability.

  This change adds standard npm package.json fields including:
  - `repository` (required for npm provenance validation via sigstore)
  - `description`, `keywords` (improve npm search discoverability)
  - `author`, `license`, `homepage`, `bugs` (legal clarity and user support)
  - `engines`, `funding`, `sideEffects` (tooling integration and optimization)

  Fixes E422 error during npm publish: "Error verifying sigstore provenance bundle: Failed to validate repository information"

- Updated dependencies [02f4e57]
  - @qwik-custom-elements/core@1.0.2

## 1.0.1

### Patch Changes

- 2ceda58: Add `@qwik-custom-elements/core` as an optional peer dependency of both adapter packages. Package managers will now warn when `core` is absent but the adapter is installed, helping users who intend to run `pnpm exec qwik-custom-elements generate` discover that they need to also install `@qwik-custom-elements/core`.
- 5aa4895: **core**: Added optional adapter hook `buildMissingCemHint({ packageRoot })` for framework-specific CEM discovery error guidance. When CEM discovery fails, core now calls this hook and appends any returned hint to the error message.

  **adapter-stencil**: Implemented `buildMissingCemHint` to detect Stencil projects (via `dist/collection/collection-manifest.json`) and provide remediation steps. When a Stencil package is missing a CEM file, users now receive actionable guidance to enable the `docs-custom-elements-manifest` output target in their Stencil configuration.

- Updated dependencies [32a398f]
- Updated dependencies [5aa4895]
  - @qwik-custom-elements/core@1.0.1
