---
'@qwik-custom-elements/adapter-stencil': patch
---

Prevent client builds from bundling Stencil hydrate runtime when SSR wrappers are generated.

The generated SSR bridge now computes the hydrate import specifier at runtime and keeps `/* @vite-ignore */` on the dynamic import. This avoids Vite statically resolving Node-only hydrate dependencies (such as `stream`) into browser bundles while preserving SSR behavior.
