# Lit SSR Adapter Subpath Gate

Lit projects generating SSR-capable output must use `@qwik-custom-elements/adapter-lit/ssr` as `adapterPackage`. The root adapter entrypoint unconditionally returns `probeSSR().available = false`, making SSR subpath selection explicit and deterministic rather than relying on runtime capability detection.
