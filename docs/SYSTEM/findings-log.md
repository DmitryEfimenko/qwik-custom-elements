# Findings Log

## 2026-04-19 - Stencil runtime import resolution should stay adapter-owned and feed SSR probing

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - Stencil runtime import resolution is adapter-specific behavior: `PACKAGE_NAME` should derive conventional `<packageName>/loader` and `<packageName>/hydrate` defaults, explicit runtime overrides should win when present, and core should consume the adapter-resolved runtime inputs when invoking SSR probes.
- Durable guidance:
  - Keep Stencil runtime default resolution in `@qwik-custom-elements/adapter-stencil`, not in core.
  - Treat `CEM` runtime imports as explicit adapter options only.
  - Pass adapter-resolved runtime inputs into downstream adapter hooks so SSR probing and later generation behavior share one runtime-resolution contract.

## 2026-04-19 - Stencil CEM runtime contract must validate loader import before generation

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/31
- Finding:
  - For `@qwik-custom-elements/adapter-stencil`, `CEM` source mode does not provide enough package context to infer the client runtime import safely, so the adapter must validate `adapterOptions.runtime.loaderImport` through a generation-time adapter hook before generation work begins.
- Durable guidance:
  - Require `adapterOptions.runtime.loaderImport` for Stencil `CEM` projects.
  - Allow `adapterOptions.runtime.hydrateImport` to remain optional so loader-only and SSR-fallback flows stay valid.
  - Keep core config loading adapter-agnostic and treat `adapterOptions` as opaque outside adapter-owned validation hooks.
  - Keep `PACKAGE_NAME` runtime fields as optional overrides on top of package-aware defaults rather than making them universally required.
  - When `PACKAGE_NAME` runtime overrides are provided explicitly, validate them as non-empty strings so bad override values fail before generation.

## 2026-04-12 - Adapter subpath type resolution should not depend on prebuilt dist during app typecheck

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/24
- Finding:
  - After moving adapter-stencil entrypoints to nested subpaths (for example `src/client/index.ts`), downstream app `check-types` can fail when TypeScript resolves package subpath types only via non-built `dist` artifacts.
- Durable guidance:
  - In workspace apps that consume local adapter subpaths, add explicit `tsconfig` `paths` mappings to source entrypoints (for example `@qwik-custom-elements/adapter-stencil/client` and `/ssr`) so local typecheck is stable independent of prebuilt package outputs.
  - Keep Vite aliasing aligned with the same source entrypoints to avoid runtime/typecheck divergence.

## 2026-04-09 - Stencil hydrate import must stay server-only in Qwik demo bridge

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/24
- Finding:
  - `@qwik-custom-elements/test-stencil-lib/hydrate` statically imports Node `stream`, so top-level imports from client-reachable demo modules cause Vite browser externalization failures.
- Durable guidance:
  - Keep Stencil hydrate loading behind SSR-only dynamic import boundaries in demo/runtime bridge code.
  - Direct top-level imports are safe for `@qwik-custom-elements/test-stencil-lib/loader` in client bootstrap paths.
  - If removing `isServer` guards from client-reachable bridge modules, use a Vite-ignored module-id dynamic import (`await import(/* @vite-ignore */ moduleId)`) so hydrate is not traversed in client build.

## 2026-04-09 - Repo-wide format touches generated artifacts

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/25
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/28
- Finding:
  - Running repo-wide `pnpm format` can touch generated/demo artifacts that are unrelated to the active PRD slice.
- Durable guidance:
  - Prefer path-scoped staging and commit-by-file for PRD task slices after full-repo formatting and feedback loops.
