# Context Map

## Contexts

- [Core](./packages/core/CONTEXT.md) — adapter-agnostic generation pipeline: config, CEM parsing, runtime resolution, orchestration, CLI
- [Adapter Lit](./packages/adapter-lit/CONTEXT.md) — Lit-specific code generation: SSR/CSR output contracts, hydration, bridge and wrapper modules
- [Adapter Stencil](./packages/adapter-stencil/CONTEXT.md) — Stencil-specific code generation: SSR/CSR output contracts, hydrate runtime, bridge and wrapper modules

## Relationships

- **Core → Adapter Lit / Adapter Stencil**: Core passes parsed ComponentMetadata and resolved RuntimeImports into each adapter's `createGeneratedOutput` hook; adapters return a Write Plan (set of `{ path, content }` records) which core executes without inspecting content
- **Adapter Lit ↔ Adapter Stencil**: Share the Bridge Component and Wrapper Component output patterns independently; each adapter owns its own naming helpers, generated output shape, and SSR capability gate
