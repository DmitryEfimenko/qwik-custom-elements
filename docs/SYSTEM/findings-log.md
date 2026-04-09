# Findings Log

## 2026-04-09 - Stencil hydrate import must stay server-only in Qwik demo bridge
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/24
- Finding:
  - `@qwik-custom-elements/test-stencil-lib/hydrate` statically imports Node `stream`, so top-level imports from client-reachable demo modules cause Vite browser externalization failures.
- Durable guidance:
  - Keep Stencil hydrate loading behind SSR-only dynamic import boundaries in demo/runtime bridge code.
  - Direct top-level imports are safe for `@qwik-custom-elements/test-stencil-lib/loader` in client bootstrap paths.

## 2026-04-09 - Repo-wide format touches generated artifacts
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/25
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/28
- Finding:
  - Running repo-wide `pnpm format` can touch generated/demo artifacts that are unrelated to the active PRD slice.
- Durable guidance:
  - Prefer path-scoped staging and commit-by-file for PRD task slices after full-repo formatting and feedback loops.
