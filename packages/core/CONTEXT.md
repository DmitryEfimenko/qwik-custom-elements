# Core

Adapter-agnostic generation pipeline responsible for config loading, CEM parsing, runtime import resolution, adapter hook orchestration, and CLI entry point. Core does not contain knowledge of any specific UI library.

## Language

**CEM (Custom Elements Manifest)**:
Machine-readable JSON describing a custom element library's components, props, events, and slots; the primary metadata source for generation.
_Avoid_: schema, manifest file

**Component Metadata**:
Parsed, adapter-facing representation of a single custom element derived from the CEM; the typed input adapters receive per component.
_Avoid_: parsed component, CEM entry

**Runtime Imports**:
Adapter-resolved module paths (loader, hydrate, SSR renderer) that the generator uses to emit working import statements in generated files.

**Adapter Hook**:
A function exported by an adapter package and called by core at a defined pipeline stage (e.g. `validateProject`, `resolveRuntimeImports`, `createGeneratedOutput`).
_Avoid_: adapter callback, plugin

**SSR Capability Probe**:
The `probeSSR()` adapter hook result; used for diagnostics and user-facing reporting only — never as a generation-time capability gate.

**Write Plan**:
The set of `{ path, content }` file records returned by an adapter's `createGeneratedOutput`; core executes writes from this plan without inspecting content.
