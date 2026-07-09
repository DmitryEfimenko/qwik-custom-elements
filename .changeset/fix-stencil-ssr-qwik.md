---
'@qwik-custom-elements/core': patch
'@qwik-custom-elements/adapter-stencil': patch
---

Fix Stencil SSR wrapper publishing by moving the SSR bridge back into the adapter runtime and publishing adapter-stencil subpaths as Qwik library entries. Generated Stencil SSR runtime files now stay thin and consume `createStencilSSRBridgeComponent` from the adapter package. The SSR bridge now also renders the custom-element host during hydration so Stencil-rendered output is not replaced by bare slot text on the client.

Publish adapter-stencil with inline Qwik entry output so consuming Qwik apps do not resolve package QRL chunks back to missing source-parent files.

Fix the core CLI entrypoint so pnpm-linked binaries execute correctly through symlinked `node_modules/.bin` paths, and resolve adapter SSR probe imports from the consuming project so linked adapters can still detect project-local hydrate runtimes.
