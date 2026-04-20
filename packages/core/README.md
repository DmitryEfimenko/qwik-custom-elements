# @qwik-custom-elements/core

Deterministic generation orchestration for Qwik custom-element wrappers.

## Ownership Boundary

`@qwik-custom-elements/core` owns the adapter-agnostic parts of generation:

- config loading and validation
- source discovery and path-safety checks
- CEM parsing into typed component metadata
- runtime-resolution orchestration and SSR capability coordination
- write planning and execution orchestration
- CLI entrypoints, summaries, and deterministic diagnostics

`@qwik-custom-elements/core` does not own framework-specific generated output shape.

In particular, core must not decide generated wrapper structure, generated barrel structure, runtime helper file shape, file extensions, or fallback wrapper generation based on adapter identity. Those responsibilities belong to adapters.

## Current Exports

This package currently exports:

- CLI helpers: `parseCliArgs`, `runCli`
- config APIs: `loadGeneratorConfig`, `validateGeneratorConfig`, `ConfigValidationError`
- generation APIs: `generateFromConfig`, `GenerationError`
- public types for config, generation results, planned writes, and run summaries

## Adapter Contract Direction

Core is responsible for producing one authoritative parsed component-metadata model and passing that metadata into adapter generation hooks.

Adapters are responsible for returning the generated file set for their frameworks.

## Documentation Expectations

Changes that alter core or adapter ownership boundaries should be reflected in:

- `docs/SYSTEM/decisions.md`
- `docs/SYSTEM/findings-log.md`
- the package README files for any affected packages
