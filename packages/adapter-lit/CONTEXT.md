# Adapter Lit

Lit-specific code generation adapter responsible for SSR/CSR bridge output, hydration wiring, and Qwik wrapper modules for Lit custom elements.

## Language

**Bridge Component**:
An adapter-generated Qwik component wrapping a Lit custom element; the SSR bridge renders via `@lit-labs/ssr`; the CSR bridge renders the element tag directly on the client.
_Avoid_: generated component, SSR wrapper

**Wrapper Component**:
An adapter-generated Qwik component with typed props and slot forwarding for one specific Lit element, consuming a Bridge Component.

**DSD (Declarative Shadow DOM)**:
The `<template shadowrootmode="open">` output emitted by `@lit-labs/ssr`; the SSR marker for Lit (contrast Stencil's `class="hydrated"` approach).
_Avoid_: shadow DOM template, SSR output

**generatedMode**:
`'ssr' | 'csr'` constant exported from generated `index.ts`; machine-verifiable in-file signal of which output mode was generated, usable at import/bundling time.

**Hydrate Support**:
`@lit-labs/ssr-client/lit-element-hydrate-support.js`; must be loaded before Lit custom elements are defined to prevent DSD duplication on client upgrade.

**SSR subpath**:
`@qwik-custom-elements/adapter-lit/ssr`; the adapter entrypoint that owns SSR bridge generation and loads Hydrate Support. The root entrypoint is CSR-only.
