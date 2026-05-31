# Lit SSR Runtime Import Probe Wiring

The Lit SSR adapter subpath must export `validateProject`, `resolveRuntimeImports`, and `probeSSR` hooks. `adapterOptions.runtime.libraryImport` is required for Lit CEM SSR projects and must be validated before generation begins; the SSR subpath owns this contract and the root entrypoint deliberately does not.
