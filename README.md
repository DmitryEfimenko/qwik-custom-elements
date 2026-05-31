# qwik-custom-elements

Generate typed, SSR-capable Qwik wrapper components from Web Component / custom element libraries.

## The Problem

Qwik does not natively server-render custom elements. Without extra tooling, Web Components appear as empty tags in SSR output, offer no type safety for props and events, and require per-component boilerplate to wire up correctly in a Qwik application.

## The Solution

`qwik-custom-elements` reads a [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) (the standard machine-readable description of your component library) and generates a set of typed Qwik wrapper components. Each wrapper:

- renders the correct server-side HTML via the library's SSR runtime
- hydrates on the client through the library's loader
- exposes fully-typed props, events, and slots as native Qwik component APIs
- requires no per-component boilerplate — re-run the CLI after upgrading your library

Generation is driven by a single JSON config file and runs via `npx qwik-custom-elements`.

## Packages

| Package                                                                       | Description                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`@qwik-custom-elements/core`](packages/core/README.md)                       | CLI and adapter-agnostic orchestration — install this alongside an adapter      |
| [`@qwik-custom-elements/adapter-stencil`](packages/adapter-stencil/README.md) | Stencil component library support (SSR via Stencil hydrate runtime)             |
| [`@qwik-custom-elements/adapter-lit`](packages/adapter-lit/README.md)         | Lit component library support (SSR via `@lit-labs/ssr`, Declarative Shadow DOM) |

## Getting Started

Pick the adapter that matches your component library and follow its Quickstart guide:

- **Stencil:** [`packages/adapter-stencil/README.md`](packages/adapter-stencil/README.md)
- **Lit:** [`packages/adapter-lit/README.md`](packages/adapter-lit/README.md)

Both adapters are configured through the same `qwik-custom-elements.config.json` format, orchestrated by `@qwik-custom-elements/core`.

## Contributing & Compatibility

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

See [COMPATIBILITY.md](COMPATIBILITY.md) for tested combinations of package versions, Qwik, and Node.js.
