# @qwik-custom-elements/adapter-stencil

## 1.0.1

### Patch Changes

- 2ceda58: Add `@qwik-custom-elements/core` as an optional peer dependency of both adapter packages. Package managers will now warn when `core` is absent but the adapter is installed, helping users who intend to run `pnpm exec qwik-custom-elements generate` discover that they need to also install `@qwik-custom-elements/core`.
- 5aa4895: **core**: Added optional adapter hook `buildMissingCemHint({ packageRoot })` for framework-specific CEM discovery error guidance. When CEM discovery fails, core now calls this hook and appends any returned hint to the error message.

  **adapter-stencil**: Implemented `buildMissingCemHint` to detect Stencil projects (via `dist/collection/collection-manifest.json`) and provide remediation steps. When a Stencil package is missing a CEM file, users now receive actionable guidance to enable the `docs-custom-elements-manifest` output target in their Stencil configuration.

- Updated dependencies [32a398f]
- Updated dependencies [5aa4895]
  - @qwik-custom-elements/core@1.0.1
