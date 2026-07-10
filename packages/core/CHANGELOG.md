# @qwik-custom-elements/core

## 1.0.3

### Patch Changes

- ea0f65a: Fix path handling so generator roots and config paths resolve consistently across macOS, Windows, and POSIX environments.
- ea0f65a: Fix Stencil SSR wrapper publishing by moving the SSR bridge back into the adapter runtime and publishing adapter-stencil subpaths as Qwik library entries. Generated Stencil SSR runtime files now stay thin and consume `createStencilSSRBridgeComponent` from the adapter package. The SSR bridge now also renders the custom-element host during hydration so Stencil-rendered output is not replaced by bare slot text on the client.

  Publish adapter-stencil with inline Qwik entry output so consuming Qwik apps do not resolve package QRL chunks back to missing source-parent files.

  Fix the core CLI entrypoint so pnpm-linked binaries execute correctly through symlinked `node_modules/.bin` paths, and resolve adapter SSR probe imports from the consuming project so linked adapters can still detect project-local hydrate runtimes.

## 1.0.2

### Patch Changes

- 02f4e57: Add npm metadata fields to fix provenance validation and improve package discoverability.

  This change adds standard npm package.json fields including:
  - `repository` (required for npm provenance validation via sigstore)
  - `description`, `keywords` (improve npm search discoverability)
  - `author`, `license`, `homepage`, `bugs` (legal clarity and user support)
  - `engines`, `funding`, `sideEffects` (tooling integration and optimization)

  Fixes E422 error during npm publish: "Error verifying sigstore provenance bundle: Failed to validate repository information"

## 1.0.1

### Patch Changes

- 32a398f: Fix package root resolution for packages with strict `exports` maps that do not expose
  `./package.json`. The generator now falls back to resolving the package's main entry point and
  walking up the directory tree to find the package root by matching the `name` field in
  `package.json`. This fixes `QCE_PACKAGE_NAME_RESOLVE_FAILED` errors when using Stencil v4
  libraries (and other packages) that omit `./package.json` from their `exports` map.
- 5aa4895: **core**: Added optional adapter hook `buildMissingCemHint({ packageRoot })` for framework-specific CEM discovery error guidance. When CEM discovery fails, core now calls this hook and appends any returned hint to the error message.

  **adapter-stencil**: Implemented `buildMissingCemHint` to detect Stencil projects (via `dist/collection/collection-manifest.json`) and provide remediation steps. When a Stencil package is missing a CEM file, users now receive actionable guidance to enable the `docs-custom-elements-manifest` output target in their Stencil configuration.
