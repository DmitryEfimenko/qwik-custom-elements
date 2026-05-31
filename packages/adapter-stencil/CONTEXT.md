# Adapter Stencil

Stencil-specific code generation adapter responsible for SSR/CSR bridge output, hydrate runtime wiring, and Qwik wrapper modules for Stencil custom elements.

## Language

**Bridge Component**:
An adapter-generated Qwik component wrapping a Stencil custom element; the SSR bridge renders via the Stencil Hydrate Runtime; the CSR bridge registers elements via the Stencil loader.
_Avoid_: generated component, SSR wrapper

**Wrapper Component**:
An adapter-generated Qwik component with typed props, event bindings, and slot forwarding for one specific Stencil element, consuming a Bridge Component.

**Hydrate Runtime**:
The `<packageName>/hydrate` module from a Stencil library; enables server-side rendering. Its presence in resolved config (`runtimeImports.hydrateImport`) is the authoritative gate for SSR wrapper generation mode.
_Avoid_: hydrate module, SSR runtime

**hasHydrateRuntime**:
Boolean derived from whether `runtimeImports.hydrateImport` is a non-empty string in resolved config; the authoritative gate for SSR wrapper generation — not the `probeSSR()` result.

**generatedMode**:
`'ssr' | 'csr'` constant exported from generated `index.ts`; same pattern as adapter-lit, indicating which output mode was generated.
