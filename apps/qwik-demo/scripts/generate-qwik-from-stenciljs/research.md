# Research: Generate Qwik From StencilJS

## Purpose

This document captures the research done for a generator that reads a built StencilJS library and emits corresponding Qwik SSR wrapper components. The generated Qwik wrappers are expected to reuse the existing SSR integration helpers already present in this app.

This file is intentionally written as a handoff artifact. A new coding agent should be able to read this file and understand the problem space, the available metadata sources, the chosen direction, and the main risks without having to repeat the same discovery work.

## Update Note

Since the initial research pass, the example Stencil config was updated to emit a custom elements manifest file at stencil-js-lib/custom-elements.json. docs-json output is still not enabled in the example config.

## Goal

Create a script under this directory that:

1. Reads component definitions from a provided StencilJS library.
2. Generates one typed Qwik wrapper component per Stencil component.
3. Reuses the existing Qwik SSR helpers, especially createStencilSSRComponent.
4. Writes the generated files into a directory provided via configuration.
5. Works both for the current demo setup and for real applications that import directly from a Stencil package.

## Existing Qwik SSR Integration

The app already contains a generic Stencil-to-Qwik SSR bridge.

Relevant files:

- qwik-app/src/components/stencil-js-qwik-ssr/stencil-ssr.tsx
- qwik-app/src/components/stencil-js-qwik-ssr/client-setup.ts
- qwik-app/src/components/stencil-js-qwik-ssr/model.ts
- qwik-app/src/components/stencil-lib-ssr.tsx
- qwik-app/src/components/stencil-js-utils.ts

Observed behavior:

1. createStencilSSRComponent creates a generic Qwik component that accepts:
   - tagName
   - props
   - slots
   - passthrough wrapper props
2. The SSR implementation uses Stencil renderToString on the server.
3. The client-side setup uses createStencilClientSetup and defineCustomElements.
4. Named slots are supported through a marker-based projection system.
5. Server-rendered styles are inlined and deduplicated per request.

Implication for generation:

The generator does not need to recreate SSR logic. It only needs to generate typed wrapper components and a shared bootstrap layer that wires library-specific runtime imports into the existing helper factories.

## Demo Runtime Setup

The demo app does not currently import Stencil loader and hydrate modules directly from an installed package. Instead it uses a small bridge layer and copied runtime assets.

Relevant files:

- qwik-app/scripts/sync-stencil-assets.ts
- qwik-app/src/components/stencil-js-utils.ts

Current asset sync behavior:

1. Copies stencil-js-lib/dist/esm to qwik-app/public/stencil-runtime/esm.
2. Copies stencil-js-lib/hydrate to qwik-app/public/stencil-runtime/hydrate.

Important finding:

This asset-copy script is sufficient for the current runtime demo, but it is not a good source of metadata for generation. The generator should read metadata from the Stencil package build outputs directly, not from copied public assets.

## Local Stencil Library Outputs Inspected

The example Stencil library currently builds with these output targets:

- dist
- dist-custom-elements
- docs-readme
- www
- dist-hydrate-script

Relevant file:

- stencil-js-lib/stencil.config.ts

The local build produces these notable outputs:

- stencil-js-lib/dist/collection/collection-manifest.json
- stencil-js-lib/dist/collection/components/*/*.js
- stencil-js-lib/dist/types/components.d.ts
- stencil-js-lib/loader/index.d.ts
- stencil-js-lib/hydrate/index.d.ts
- stencil-js-lib/src/components/*/readme.md

Important nuance:

Some searches initially missed dist outputs because broad glob queries were not reliable in this environment, but direct file reads confirmed that the local library does contain the expected dist artifacts.

## Metadata Sources Evaluated

### 1. Custom Elements Manifest

Source:

- Stencil docs-custom-elements-manifest output target

What it can provide:

- component tags
- properties
- attributes
- events
- methods
- slots
- CSS parts and CSS properties

Pros:

1. Standardized format.
2. Rich metadata for tooling.
3. Good fit for wrapper generation.

Cons:

1. Not currently enabled in the example Stencil config.
2. Some slot data depends on documentation tags being maintained.

Assessment:

Best structured source when available. Should be preferred, but cannot be the only supported source for v1.

### 2. docs-json

Source:

- Stencil docs-json output target

What it can provide:

- props
- methods
- events
- listeners
- documented slots
- documentation metadata

Pros:

1. Rich and explicit.
2. Suitable for tooling.
3. Easier to parse than source AST.

Cons:

1. Not currently enabled in the example Stencil config.
2. Slots are documentation-driven, not guaranteed to reflect actual render output.

Assessment:

Good preferred source when present. Should be used if available, but should not be mandatory.

### 3. dist collection output

Source:

- stencil-js-lib/dist/collection/collection-manifest.json
- stencil-js-lib/dist/collection/components/*/*.js

What it can provide:

- component discovery through collection-manifest.json entries
- tag name through static get is()
- property metadata through static get properties()
- style metadata
- some slot inference opportunities by scanning compiled render output

Pros:

1. Available in the current build.
2. Good enough for tag and prop discovery.
3. Does not require source parsing for the basic case.

Cons:

1. Not ideal for events and methods.
2. Slots are not first-class metadata and may require inference.
3. Generated code shape may vary across Stencil versions.

Assessment:

Strong fallback source. Practical for v1.

### 4. dist/types/components.d.ts

Source:

- stencil-js-lib/dist/types/components.d.ts

What it can provide:

- component interface names
- tag-to-element mapping
- richer prop types, including unions
- LocalJSX intrinsic element typing patterns

Pros:

1. Strong source for TypeScript typing.
2. Available in the current build.
3. Complements collection metadata well.

Cons:

1. Does not describe full runtime behavior.
2. Does not reliably expose slot or event metadata in a generator-friendly way.

Assessment:

Best fallback typing source. Should be combined with collection metadata.

### 5. Source TSX parsing

Source:

- stencil-js-lib/src/components/**/*.tsx

What it can provide:

- decorators
- actual slot elements in render output
- shadow configuration
- event and method decorators if present

Pros:

1. Can recover metadata not available elsewhere.
2. Useful for slot fallback.

Cons:

1. Highest implementation complexity.
2. More fragile than consuming explicit build metadata.
3. Ties generation more tightly to source layout.

Assessment:

Useful as a fallback for slot detection and potentially for future event/method recovery. Should not be the primary metadata source for v1.

## Concrete Findings From The Example Library

### Components discovered

The example library currently contains these components:

1. de-alert
2. de-alert-shadow
3. de-button
4. de-button-shadow

### Props observed

From collection output and type declarations:

1. de-alert
   - heading: string
   - default: 'Alert'
2. de-alert-shadow
   - heading: string
   - default: 'Alert'
3. de-button
   - size: 'sm' | 'md' | 'lg'
   - default: 'md'
4. de-button-shadow
   - size: 'sm' | 'md' | 'lg'
   - default: 'md'

### Slots observed

By inspecting compiled render output and current demo usage:

1. de-alert has:
   - default slot
   - named slot footer
2. de-alert-shadow has:
   - default slot
   - named slot footer
3. de-button has:
   - default slot
4. de-button-shadow has:
   - default slot

### Events and methods observed

No meaningful event or public method metadata was found in the example library. This means v1 generation must tolerate libraries that have no event metadata available, even if event props are passed through at runtime.

## Official Stencil Research Summary

Official documentation confirms:

1. docs-custom-elements-manifest is supported in Stencil v4.42+ and can include properties, methods, events, attributes, slots, CSS properties, CSS parts, and custom states.
2. docs-json can include props, methods, events, listeners, documented slots, styles, and usage metadata.
3. dist-custom-elements is intended for consumers that bundle and register custom elements themselves.
4. Custom element assets may require explicit asset-path handling when consuming custom-elements output directly.

Generator implication:

The generator should not assume that one metadata format is always present. It should prefer richer documentation outputs when available and degrade gracefully to build outputs that are commonly present.

## Implementation Options Considered

### Option A: Require CEM or docs-json

Pros:

1. Cleaner implementation.
2. Richer metadata.
3. Better future support for events and methods.

Cons:

1. Fails for libraries that do not emit docs metadata.
2. Not compatible with the current example library without Stencil config changes.

Decision:

Rejected as the only v1 strategy.

### Option B: Use collection + d.ts only

Pros:

1. Works with current local build.
2. No Stencil config changes required.
3. Good enough for typed prop generation.

Cons:

1. Weaker event support.
2. Slot discovery requires heuristics.
3. Less future-proof than a richer metadata format.

Decision:

Useful fallback, but not ideal as the sole strategy.

### Option C: Parse source files directly

Pros:

1. Can recover most details if source is available.
2. Potentially very complete.

Cons:

1. Most complex.
2. More brittle.
3. Harder to keep reliable across varied Stencil codebases.

Decision:

Use only as targeted fallback, mainly for slot inference.

### Option D: Hybrid strategy

Pros:

1. Works with the current example library.
2. Works with richer future libraries.
3. Avoids forcing a particular Stencil config on consumers.

Cons:

1. More implementation complexity than a single-source parser.
2. Requires a normalization layer.

Decision:

Accepted. This is the chosen direction.

## Chosen Design Decisions

The following decision points were explicitly chosen:

1. Metadata strategy:
   - Prefer CEM or docs-json when present.
   - Fall back to dist collection plus dist types plus slot scanning.
2. Input support:
   - Support both a Stencil package root path and a package name.
3. Generated API shape:
   - Generate one typed Qwik wrapper component per Stencil tag.
4. Naming:
   - Use PascalCase names without an SSR suffix.
5. Slots:
   - Auto-discover named slots when possible.
   - Fall back to source or compiled-output slot scanning when needed.
6. Events:
   - Generate typed onEvent$ props when metadata exists.
   - Otherwise keep compatibility by allowing passthrough on* props.
7. Runtime import mode:
   - Make it configurable.
   - Support demo mode and package mode.
8. Runtime reuse:
   - Reuse existing Qwik SSR helper modules.
9. Output policy:
   - Clean the configured output directory before regeneration.
10. Scope for v1:
   - Core generation only.
   - No watch mode in the first pass.

## Config Direction Chosen

The generator should use:

1. A generator.config.json file inside this directory.
2. CLI overrides for important values.
3. A required configured output directory, with CLI override support.
4. An explicit importMode field with values demo or package.

Likely config concerns:

- outDir
- importMode
- stencilPath
- packageName
- cleanOutput
- optional runtime import overrides

## Runtime Mode Expectations

### Demo mode

Use the existing app bridge layer:

- defineCustomElements from qwik-app/src/components/stencil-js-utils.ts
- renderToString from qwik-app/src/components/stencil-js-utils.ts

Purpose:

This mode supports the current local demo where Stencil outputs are copied into the Qwik app and loaded from public assets or local file URLs.

### Package mode

Import directly from package subpaths:

- <package>/loader
- <package>/hydrate

Purpose:

This mode matches real-world package consumption where the Stencil library is installed and imported directly.

## Current Risks And Constraints

1. Slot metadata may be incomplete when only collection and type outputs are available.
2. Event typing may be unavailable for some libraries without CEM or docs-json.
3. Package layouts can vary slightly between local linking and published packages.
4. Output cleanup must be bounded carefully to avoid deleting unintended files.
5. Generated file imports must remain stable relative to the configured output directory.

## Recommendations For Future Improvement

1. Add docs-custom-elements-manifest to the example Stencil config for a more robust canonical metadata source.
2. Consider docs-json support in parallel if consumers already emit it.
3. Add a dry-run or inspect mode so agents can validate metadata discovery without writing files.
4. Add generation manifest output so future agents can quickly see what source provider was used.
5. Consider package subpath overrides later if real libraries expose non-standard hydrate or loader paths.

## Summary

The correct v1 approach is a hybrid metadata pipeline that reuses the existing Qwik SSR runtime and generates typed wrapper components into a configured output directory. The generator should not depend on copied demo assets for metadata, should support both demo and package runtime import modes, and should be resilient when only standard dist outputs are available.
