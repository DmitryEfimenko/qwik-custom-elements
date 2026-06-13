---
'@qwik-custom-elements/adapter-stencil': patch
'@qwik-custom-elements/adapter-lit': patch
---

Add `@qwik-custom-elements/core` as an optional peer dependency of both adapter packages. Package managers will now warn when `core` is absent but the adapter is installed, helping users who intend to run `pnpm exec qwik-custom-elements generate` discover that they need to also install `@qwik-custom-elements/core`.
