# Stencil Wrapper Mode Gate

SSR wrapper generation mode is gated on `hasHydrateRuntime` (whether `runtimeImports.hydrateImport` is a non-empty string in resolved config), not on `ssrAvailable`. The probe result is for diagnostics only; config presence is the authoritative capability signal because the Stencil hydrate module cannot be dynamically imported inside the generator process.
