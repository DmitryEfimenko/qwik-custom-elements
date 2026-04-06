# Plan: Generate Qwik From StencilJS

## How To Use This Plan

This file is written for handoff between independent coding agents.

Rules for updating this file during implementation:

1. Update the State field of the item you are actively working on.
2. When an item is completed, add any durable observations to the Findings section.
3. Do not mark an item done until its acceptance criteria and verification steps have been satisfied.
4. If scope changes, update this file before making implementation changes.

Primary research reference:

- ./research.md

## Current Status Snapshot

1. Research is complete.
2. Initial generator skeleton files now exist with separated module responsibilities.
3. Typed linting for nested scripts is enabled via scripts/tsconfig.json include update.
4. Typed per-component wrapper emission is now implemented and generated wrappers consume the shared runtime bootstrap module.

## Findings

These are confirmed findings that future agents should not need to rediscover.

1. The current demo app already has a generic SSR bridge in qwik-app/src/components/stencil-js-qwik-ssr and a demo runtime bridge in qwik-app/src/components/stencil-js-utils.ts.
2. The existing sync script only copies runtime assets needed for demo execution. It should not be treated as the metadata source for generation.
3. The example Stencil library already emits useful fallback metadata in dist/collection and dist/types.
4. The example Stencil config now emits docs-custom-elements-manifest as custom-elements.json, while docs-json is still not emitted.
5. Named slots exist in the example library and must be supported by generated wrappers.
6. Event metadata is not meaningfully available in the example library, so the generator must support a graceful degraded typing path.
7. Generated wrapper names should be PascalCase without an SSR suffix.
8. Output cleanup is expected behavior, but it must be restricted to the configured generated output directory.
9. Module boundaries are now established in scripts/generate-qwik-from-stenciljs as: CLI (index.ts and cli.ts), config (config.ts), providers (providers/*), normalization (normalization/index.ts), emitters (emitters/*), and output writer (output/index.ts).
10. Nested scripts under scripts/** should be included in scripts/tsconfig.json to avoid typed-lint false negatives for new subdirectories.
11. The generator now expects scripts/generate-qwik-from-stenciljs/generator.config.json by default and fails fast with guidance when the file is missing or malformed.
12. Source selection is validated as exactly one of stencilPath or packageName; CLI overrides intentionally replace the opposite source field unless both are explicitly provided.
13. Source preflight now validates dist/collection/collection-manifest.json and dist/types/components.d.ts before generation proceeds.
14. packageName resolution uses Node module resolution from qwik-app; when the package is not installed or linked, the error now explicitly advises linking or using stencilPath.
15. CEM provider detection currently checks custom-elements.json in common root and dist locations and normalizes components, props, events, methods, and slots when present.
16. The current example custom-elements.json contains component and prop metadata but no slot or event data, so slot and event arrays remain empty in normalized CEM output.
17. docs-json provider detection supports common filenames and normalizes slots from both slots entries and docsTags slot annotations.
18. Dist fallback provider now reads tag names and property metadata from dist/collection component files and merges LocalJSX type declarations from dist/types/components.d.ts for richer prop types.
19. For the current example library, fallback provider discovery finds 4 components and preserves the de-button size union type as 'sm' | 'md' | 'lg'.
20. Slot fallback scans dist/collection component render output for h("slot", ...) usage, infers default and named slots, and merges with provider slots without duplication.
21. For the current example library through provider-selection flow, de-alert resolves to default + footer slot and de-button resolves to default slot only.
22. Normalization now deduplicates by tag and by member name (props, events, methods), trims/normalizes slot names, and guarantees deterministic ordering for emitter consumption.
23. Normalized metadata now carries provenance with metadataProvider, sourceRoot, and slotFallbackApplied so later diagnostics and manifest generation can reuse a single source-of-truth object.
24. Runtime bootstrap emission resolves helper imports relative to configured outDir and emits one shared runtime.generated.ts module with reusable symbols for wrapper emitters.
25. Demo mode runtime imports default to src/components/stencil-js-utils while package mode defaults to <packageName>/loader and <packageName>/hydrate, with runtime override support from config.
26. Wrapper emitter now generates one PascalCase file per component with fixed internal tagName and typed metadata-driven prop interfaces, while avoiding SSR suffix naming.
27. Named slot behavior is encoded by generated <Slot name="..." /> projections and slots metadata wiring to the shared runtime component.
28. Wrapper prop interfaces now emit typed onEvent$ QRL callbacks when metadata provides events, mapping detail types to CustomEvent<...> and falling back to CustomEvent<unknown> when detail types are missing.
29. Wrappers always keep an open [key: string]: unknown index signature so libraries without event metadata still accept runtime passthrough props without claiming unsupported event details.
30. Generated output now includes an index.ts barrel that re-exports runtime.generated and all emitted wrapper modules from the configured output directory.
31. Generated output now includes generation-manifest.json with provider, provenance, source path/package inputs, import mode, component count, per-component wrapper mapping, and generation timestamp for troubleshooting provider selection.
32. Output cleanup now hard-fails when outDir resolves to the workspace root, a filesystem root, or a path outside the qwik-app workspace; deletion is limited to safe subdirectories only.
33. Generator writes are now deterministic by sorting emitted files and wrapper exports, preserving unchanged file contents when possible, and deriving manifest generatedAt from a stable metadata fingerprint instead of wall-clock time.
34. Qwik app package scripts now include generate:stencil-wrappers using tsx scripts/generate-qwik-from-stenciljs/index.ts, which keeps generator invocation consistent with existing tsx-based script conventions.
35. Operator documentation now lives at scripts/generate-qwik-from-stenciljs/README.md and includes run commands, config fields, import modes, required artifacts, and troubleshooting for common missing-artifact and source-configuration failures.
36. Route validation now uses generated wrappers directly in src/routes/index.tsx via DeButton, DeAlert, and useGeneratedStencilClientSetup instead of the generic StencilJsLibSSRComponent API.
37. Item 16 verification is partially complete: app type-check, generator run, production build, and preview SSR HTML checks passed, but interactive client-side click behavior was not fully validated in-terminal because this workflow has no browser automation step wired into the plan.
38. For Qwik event wiring, forwarding on* and $* props from the wrapper props bag is best centralized in createStencilSSRComponent; this keeps generated wrappers smaller and lets Qwik attach listeners declaratively on the bridge root while Stencil element props continue through the existing update path.
39. Interactive validation is now complete: user-confirmed click handling works on the dev server after centralized event forwarding, while SSR output and named slot projection remained intact.
40. The last user-confirmed working interaction fix was wrapper-level splitting of on* and $* props in generated wrappers, passing only element props through the props bag and forwarding event props directly on GeneratedStencilComponent; later shared-bridge experiments regressed runtime behavior and should not replace that path without fresh verification.
41. Item 17 runtime handling now wires events map listeners in createStencilSSRComponent with explicit client-ready gating (no useVisibleTask$), listener cleanup on rerender/unmount, and listener attachment on the Stencil custom element rather than the wrapper.
42. Validation for event-map handler replacement should ensure alternate QRL callbacks are serialized in the test route; in this workspace the hidden warmup handler references on /stencil-events avoid false negatives when switching mapped handlers after resume.
43. Item 18 wrapper emission now builds an events map keyed by normalized Stencil event name and only includes entries when the corresponding onEvent$ prop is provided, passing mappedEvents to GeneratedStencilComponent while keeping non-event metadata components on events={undefined}.

## Execution Order

### Item 1: Preserve research and decisions

State: done

Description:

Record the research findings, evaluated implementation options, confirmed environment details, and explicit decisions in a durable document that future agents can use as the canonical background reference.

Acceptance criteria:

1. A research.md file exists in this directory.
2. The file explains the existing Qwik SSR integration, inspected Stencil outputs, metadata options, selected approach, and key risks.
3. The file clearly records the chosen decision points.

Verification steps:

1. Open research.md.
2. Confirm it contains sections for metadata sources, option evaluation, chosen decisions, and current constraints.
3. Confirm it is understandable without re-reading the original conversation.

### Item 2: Define generator file layout and module boundaries

State: done

Description:

Create the implementation skeleton for the generator and decide the internal module boundaries before coding logic. The goal is to prevent a single oversized script and make future handoff simpler.

Expected module groups:

1. CLI entrypoint.
2. Config loader and validator.
3. Metadata providers.
4. Metadata normalization.
5. Code emitters.
6. Output writer and cleanup.

Acceptance criteria:

1. A clear file layout exists under this directory.
2. Each file has a focused responsibility.
3. The module layout is documented briefly in code comments or in this plan if it differs from expectations.

Verification steps:

1. Inspect the directory tree.
2. Confirm that no single file is carrying unrelated responsibilities.
3. Confirm future agents can identify where to add or fix behavior.

Implementation notes:

1. Entry and orchestration: index.ts, generator.ts.
2. CLI parsing boundary: cli.ts.
3. Config boundary: config.ts.
4. Provider boundary: providers/load-cem-metadata.ts, providers/load-docs-json-metadata.ts, providers/load-dist-fallback-metadata.ts, providers/index.ts.
5. Normalization boundary: normalization/index.ts.
6. Emitter boundary: emitters/emit-runtime-bootstrap.ts, emitters/emit-component-wrappers.ts, emitters/index.ts.
7. Output boundary: output/index.ts.
8. Shared contracts and utilities: types.ts, utils.ts.

### Item 3: Define config contract and CLI override behavior

State: done

Description:

Implement the config contract used by the generator. The config file should live in this directory and should support CLI overrides so the generator can be reused in different setups.

Minimum config needs:

1. outDir
2. importMode
3. stencilPath or packageName
4. cleanOutput
5. optional runtime import overrides

Acceptance criteria:

1. Config can be loaded from generator.config.json.
2. CLI flags can override the most important settings.
3. Invalid config produces actionable error messages.
4. The implementation prevents ambiguous source configuration.

Verification steps:

1. Run the generator with config only.
2. Run the generator with CLI overrides.
3. Run with invalid or conflicting options and confirm the error message explains what to fix.

### Item 4: Resolve Stencil input source and validate prerequisites

State: done

Description:

Implement source resolution so the generator can operate on either a package root path or a package name. Validate that required build outputs are present before generation starts.

Acceptance criteria:

1. The generator can resolve a Stencil source from a path.
2. The generator can resolve a Stencil source from a package name when supported by the environment.
3. Missing required artifacts fail fast with actionable guidance.
4. Validation happens before any file deletion or output writing.

Verification steps:

1. Run with a valid local path.
2. Run with an invalid path and verify the failure mode.
3. Run with intentionally missing artifacts and confirm the message explains which artifact is missing and what build step is needed.

### Item 5: Implement preferred metadata provider for CEM and docs-json

State: done

Description:

Implement the higher-fidelity metadata readers first. These should parse CEM and docs-json when available and expose a normalized intermediate representation.

Acceptance criteria:

1. The generator can detect and parse docs-custom-elements-manifest output when present.
2. The generator can detect and parse docs-json output when present.
3. Component tags, props, events, methods, and documented slots are extracted when available.
4. Output is normalized into the shared internal metadata model.

Verification steps:

1. Test against a library that emits CEM or docs-json.
2. Inspect normalized output in logs or dry-run mode.
3. Confirm missing optional sections do not crash parsing.

### Item 6: Implement fallback metadata provider from dist collection and dist types

State: done

Description:

Implement the provider that works with the current example library. This provider should discover components from the collection manifest, read collection component files for runtime metadata, and combine that with dist type declarations for stronger TypeScript output.

Acceptance criteria:

1. Components can be discovered from collection-manifest.json.
2. Tag names and prop metadata are read from collection component files.
3. Richer prop typings are read from dist/types/components.d.ts.
4. The provider can succeed even when no docs metadata exists.

Verification steps:

1. Run against the current example library.
2. Confirm the discovered component count matches the known local components.
3. Confirm union prop types such as button size are preserved in generated types.

### Item 7: Implement slot discovery fallback

State: done

Description:

Implement fallback slot discovery for cases where metadata providers do not contain reliable slot information. This may scan source TSX and or compiled collection render output.

Acceptance criteria:

1. Default slot support can be identified.
2. Named slots can be discovered and deduplicated.
3. The approach works for the current example alert component.
4. Failure to discover slots does not break generation for components that only need default children.

Verification steps:

1. Confirm de-alert discovers the footer slot.
2. Confirm de-button is treated as default-slot only.
3. Confirm duplicate slot names are not emitted.

### Item 8: Normalize all metadata into one internal model

State: done

Description:

Create one normalized internal representation that all providers map into. This prevents emitters from needing provider-specific logic.

The model should cover at minimum:

1. componentName
2. tagName
3. props and prop types
4. event metadata when present
5. namedSlots
6. defaultSlot presence
7. source provenance

Acceptance criteria:

1. All provider outputs map into the same internal shape.
2. Emitters read only the normalized model.
3. Provenance is available for diagnostics and manifest output.

Verification steps:

1. Run normalization from each provider path.
2. Inspect the normalized result for the example library.
3. Confirm emitters do not import provider-specific types.

### Item 9: Generate shared runtime bootstrap file

State: done

Description:

Generate the shared runtime layer that binds library-specific imports to the existing Qwik SSR helper factories.

This layer should:

1. Import createStencilSSRComponent and createStencilClientSetup from the existing helper runtime.
2. Import defineCustomElements and renderToString according to importMode.
3. Export the shared generated runtime symbols used by per-component wrappers.

Acceptance criteria:

1. Demo mode uses the existing app bridge.
2. Package mode imports directly from package loader and hydrate entries.
3. The file compiles in the configured output location.
4. The runtime file is reused by generated wrappers instead of duplicating logic.

Verification steps:

1. Generate in demo mode and inspect imports.
2. Generate in package mode and inspect imports.
3. Confirm there is a single shared runtime bootstrap file.

### Item 10: Generate one typed wrapper component per Stencil component

State: done

Description:

Implement the main code emitter that writes one component file per discovered Stencil component. Each generated wrapper should fix the Stencil tagName internally and expose a typed Qwik-friendly API.

Acceptance criteria:

1. One file is emitted per component.
2. Generated names are PascalCase without an SSR suffix.
3. Each wrapper uses the shared runtime component internally.
4. Props are typed from metadata.
5. Named slot requirements are encoded into the wrapper behavior where possible.

Verification steps:

1. Inspect generated output for de-button and de-alert.
2. Confirm tagName is not required from end users of the generated wrappers.
3. Confirm generated wrappers call the shared runtime instead of duplicating SSR logic.

### Item 11: Handle event prop typing and passthrough compatibility

State: done

Description:

Implement event typing behavior. When event metadata exists, generate typed Qwik event props. When it does not, preserve runtime compatibility by allowing passthrough event-like props without pretending the metadata is known.

Acceptance criteria:

1. Typed onEvent$ props are emitted when metadata is present.
2. Libraries without event metadata still generate usable wrappers.
3. The generated types do not falsely claim unsupported event details.

Verification steps:

1. Test with metadata containing events if available.
2. Test with the current example library and confirm the absence of event metadata does not block generation.
3. Run type-check to ensure the resulting types are valid.

### Item 12: Generate index exports and generation manifest

State: done

Description:

Generate the barrel export file and a small metadata manifest describing what was generated. The manifest is primarily for debugging and future-agent handoff.

Acceptance criteria:

1. An index file exports all generated wrappers and shared runtime exports.
2. A small manifest file records provider choice, component count, source location, and timestamp.
3. The manifest contains enough detail to troubleshoot provider selection.

Verification steps:

1. Open the generated index file and confirm all wrappers are exported.
2. Open the manifest and confirm it reflects the run inputs and provider.

### Item 13: Implement bounded output cleanup and deterministic writes

State: done

Description:

Implement the configured clean-output behavior safely. The generator should remove and recreate only the target generated directory and then write files deterministically.

Acceptance criteria:

1. Cleanup is limited to the configured outDir boundary.
2. Repeated runs produce stable file contents when inputs are unchanged.
3. The generator never deletes unrelated directories.

Verification steps:

1. Run generation twice and compare outputs.
2. Use a nested output path and confirm only that directory is cleaned.
3. Review path validation logic for boundary safety.

### Item 14: Add package.json script integration

State: done

Description:

Add the npm script entry points needed to invoke the generator conveniently within the Qwik app.

Acceptance criteria:

1. package.json contains a script for generation.
2. The script uses the chosen TypeScript runner already used by the app.
3. Script naming is consistent with existing app conventions.

Verification steps:

1. Run the package script.
2. Confirm it resolves the generator entrypoint correctly.

### Item 15: Add operator-facing documentation for the generator

State: done

Description:

Add a short README or equivalent documentation for running the generator, configuring it, understanding import modes, and troubleshooting common failure modes.

Acceptance criteria:

1. The documentation covers config fields.
2. The documentation explains demo mode versus package mode.
3. The documentation explains required Stencil outputs.
4. The documentation explains common missing-artifact errors.

Verification steps:

1. Read the documentation as if you had not seen the conversation.
2. Confirm it is enough to run the generator from scratch.

### Item 16: Validate generated code in the current app

State: done

Description:

Use the current example library and app to validate that generated wrappers actually work, not just that files were emitted.

Minimum validation scope:

1. Type-check generated code.
2. Replace at least one route usage with generated wrappers.
3. Verify SSR output and client-side behavior.
4. Verify named slot projection.

Acceptance criteria:

1. Generated wrappers compile with the app.
2. At least one example route renders successfully using generated wrappers.
3. The alert-style named slot case works.
4. The demo runtime path still works with the current asset-copy approach.

Verification steps:

1. Run the app type-check.
2. Run the generator and inspect output.
3. Swap route usage to generated wrappers.
4. Run the app and verify de-button and de-alert behavior.

### Item 17: Implement runtime handling for Stencil events map

State: done

Description:

Update createStencilSSRComponent in qwik-app/src/components/stencil-js-qwik-ssr/stencil-ssr.tsx to consume the events prop from qwik-app/src/components/stencil-js-qwik-ssr/model.ts as a key-value map of Stencil event name to QRL callback. For each event key present in the map, the runtime bridge should invoke the mapped QRL when that Stencil event fires on the rendered custom element.

Constraints and implementation guidance:

1. Do not change the wrapper style using display: contents.
2. Do not use useVisibleTask$ for the primary solution because the wrapper is not visibility-observable in this setup.
3. Do not assume a one-time useTask$ run from SSR is sufficient; follow Qwik task guidance and choose a client-capable tracked trigger so listener wiring runs after resume.
4. Attach listeners to the Stencil custom element, not to the wrapper div.
5. Define cleanup behavior for listener replacement and component teardown.

Acceptance criteria:

1. The events map is read by createStencilSSRComponent and each event key invokes its mapped QRL callback.
2. SSR output, slot projection, and prop synchronization continue to work unchanged.
3. The solution preserves display: contents and does not depend on useVisibleTask$.
4. Listener attachment and cleanup are defined for rerenders and unmounts.

Verification steps:

1. Validate on an SSR-rendered route that a Stencil custom event invokes the mapped QRL callback in the browser.
2. Validate that multiple component instances keep event listeners isolated.
3. Validate that rerendering with changed events map entries replaces listeners correctly.
4. Validate that named slots and non-event props continue to behave as before.

### Item 18: Update wrapper generation to emit and pass events map

State: done

Description:

Update the generator so emitted Qwik wrappers construct and pass the events prop expected by Item 17. Generated wrappers should continue to expose typed onEvent$ props from metadata, but now translate those props into an events map of Stencil event name to QRL callback for the shared runtime bridge.

Acceptance criteria:

1. Generated wrappers pass events as Record<string, QRL<(...args: any[]) => void>>, not as an array or string list.
2. Event names come from normalized metadata when available and map to the correct generated onEvent$ prop names.
3. Components without event metadata continue to compile and preserve graceful degraded behavior.
4. Existing wrapper prop typing remains valid and does not overstate unsupported event detail types.

Verification steps:

1. Regenerate wrappers and inspect a component with event metadata to confirm it passes an events map.
2. Regenerate wrappers for a component without event metadata and confirm no invalid events map is emitted.
3. Run app type-check, generated wrapper type-check, and lint after regeneration.
4. Verify the generated wrapper path works end-to-end with the runtime event handling from Item 17.

## Deferred Work

These are intentionally out of scope for the first implementation unless the scope is explicitly expanded.

1. Watch mode.
2. Auto-running Stencil builds.
3. Full AST-based event and method recovery for libraries without metadata outputs.
4. Formatting integration beyond what is needed for readable generated files.
5. Special-case support for unusual package subpath layouts unless a real package requires it.

## Suggested Update Pattern For Future Agents

When picking up work:

1. Read research.md first.
2. Read this plan.md second.
3. Move the current item to in progress in your own working notes.
4. After completing an item, update State and append any durable insight to Findings.
5. If you discover a contradiction between implementation and research, update both files before continuing.
