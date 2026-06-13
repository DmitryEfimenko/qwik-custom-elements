# @qwik-custom-elements/core

## 1.0.1

### Patch Changes

- 32a398f: Fix package root resolution for packages with strict `exports` maps that do not expose
  `./package.json`. The generator now falls back to resolving the package's main entry point and
  walking up the directory tree to find the package root by matching the `name` field in
  `package.json`. This fixes `QCE_PACKAGE_NAME_RESOLVE_FAILED` errors when using Stencil v4
  libraries (and other packages) that omit `./package.json` from their `exports` map.
- 5aa4895: **core**: Added optional adapter hook `buildMissingCemHint({ packageRoot })` for framework-specific CEM discovery error guidance. When CEM discovery fails, core now calls this hook and appends any returned hint to the error message.

  **adapter-stencil**: Implemented `buildMissingCemHint` to detect Stencil projects (via `dist/collection/collection-manifest.json`) and provide remediation steps. When a Stencil package is missing a CEM file, users now receive actionable guidance to enable the `docs-custom-elements-manifest` output target in their Stencil configuration.
