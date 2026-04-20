# @qwik-custom-elements/adapter-lit

Lit-specific adapter contract and SSR surface for generated Qwik custom-element integration.

## Ownership Boundary

`@qwik-custom-elements/adapter-lit` owns Lit-specific generation behavior.

That ownership includes:

- Lit capability metadata
- Lit SSR capability probing and SSR-specific output contracts
- adapter-owned generated barrels, wrapper modules, and any Lit-specific generated helper modules
- framework-specific output shape decisions that must not live in core

Core may orchestrate the run and pass typed parsed component metadata into the adapter, but core should not shape Lit-generated output directly.

## Current Exports

This package currently exposes:

- `@qwik-custom-elements/adapter-lit`
  - Lit adapter metadata
  - SSR capability probe wiring
- `@qwik-custom-elements/adapter-lit/ssr`
  - Lit SSR placeholder probe and SSR markup contract

## Current Status

Lit support is still an adapter-contract surface rather than a complete generated-wrapper implementation.

Even so, the architectural boundary is already fixed: when Lit-generated wrappers or helper modules are emitted, they belong to this adapter rather than `@qwik-custom-elements/core`.

## Documentation Expectations

When Lit adapter contracts or generated output ownership change, update this README alongside the system decisions and findings logs.
