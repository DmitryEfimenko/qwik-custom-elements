# @qwik-custom-elements/core

Deterministic generation orchestration for Qwik custom-element wrappers.

## Install

```
npm install @qwik-custom-elements/core
```

## Quickstart

Create a `qwik-custom-elements.config.json` at your project root:

```json
{
  "projects": [
    {
      "id": "my-lib",
      "adapter": "stencil",
      "adapterPackage": "@qwik-custom-elements/adapter-stencil",
      "source": {
        "type": "PACKAGE_NAME",
        "packageName": "my-stencil-lib"
      },
      "outDir": "./src/generated/my-lib"
    }
  ]
}
```

Then run the generator:

```
npx qwik-custom-elements
```

Generated Qwik wrapper files are written to the configured `outDir`. Re-run after upgrading the component library to regenerate.

## Support Policy

This package follows semantic versioning. See [COMPATIBILITY.md](../../COMPATIBILITY.md) for the tested combinations of core, adapters, Qwik, and Node.js.

Breaking changes always include an explicit `BREAKING` section in the release notes and require an update to `COMPATIBILITY.md` before merging.

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

- an ADR in `docs/adr/` (system-wide) or the affected package's `docs/adr/` (context-specific)
- the affected `CONTEXT.md` if new domain terms are introduced
- the package README files for any affected packages
