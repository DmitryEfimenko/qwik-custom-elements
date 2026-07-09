---
'@qwik-custom-elements/adapter-stencil': patch
---

Fix Stencil client setup timing by listening to `readystatechange` instead of only `load`. This ensures setup hooks run reliably when wrappers mount after initial load timing has advanced, while still executing setup exactly once.