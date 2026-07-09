---
'@qwik-custom-elements/adapter-stencil': patch
---

Generate Stencil SSR runtime bridges with a direct dynamic hydrate import instead of the Vite-ignored indirection. This allows SSR bundlers to include hydrate runtime code reliably and avoids request-time module resolution failures in dist preview/server layouts.