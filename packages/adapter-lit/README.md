# @qwik-custom-elements/adapter-lit

Lit-specific adapter contract and SSR surface for generated Qwik custom-element integration.

## Install

```
npm install @qwik-custom-elements/adapter-lit
```

Peer dependencies:

```
npm install @builder.io/qwik lit
```

For SSR support, also install the optional peers:

```
npm install @lit-labs/ssr @lit-labs/ssr-client
```

## Quickstart

Reference this adapter in your `qwik-custom-elements.config.json`:

```json
{
  "projects": [
    {
      "id": "my-lit-lib",
      "adapter": "lit",
      "adapterPackage": "@qwik-custom-elements/adapter-lit",
      "source": {
        "type": "PACKAGE_NAME",
        "packageName": "my-lit-lib"
      },
      "adapterOptions": {
        "runtime": {
          "libraryImport": "my-lit-lib"
        }
      },
      "outDir": "./src/generated/lit/csr"
    }
  ]
}
```

For SSR-capable generation, set `"adapterPackage"` to `"@qwik-custom-elements/adapter-lit/ssr"` and point `"outDir"` to a separate SSR folder.

Run `npx qwik-custom-elements` to generate Qwik wrappers from the Lit component library.

## Support Policy

This package follows semantic versioning. See [COMPATIBILITY.md](../../COMPATIBILITY.md) for tested combinations of adapter-lit, Qwik, Lit, `@lit-labs/ssr`, and Node.js.

Breaking changes always include an explicit `BREAKING` section in the release notes and require an update to `COMPATIBILITY.md` before merging.

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
