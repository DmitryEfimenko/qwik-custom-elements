# Decisions

## DEC-2026-05-30-LIT-GENERATED-INDEX-MODE-CONSTANT

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/48
- Decision:
  - Adapter-lit's generated `index.ts` must emit `export const generatedMode = 'ssr' | 'csr' as const;` alongside `generatedComponentTags`.
  - Value is `'ssr'` when `ssrAvailable === true`; `'csr'` otherwise (covers both CSR-configured and SSR-fallback projects).
  - This constant is adapter-lit owned (not core owned), consistent with adapter-owned output shape decisions.
- Rationale:
  - Makes mode explicitly machine-verifiable at the generated output level, satisfying the "client-only and SSR-capable mode signals must be explicit" requirement.
  - Complements the `generated-run-summary.json` `ssrCapabilities.available` flag with an in-file signal usable at import/bundling time.

## DEC-2026-05-05-LIT-SSR-RUNTIME-IMPORT-PROBE-WIRING

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Decision:
  - `@qwik-custom-elements/adapter-lit/ssr` must provide deterministic runtime-import lifecycle hooks:
    - `validateProject(...)` enforces runtime override contract for `adapterOptions.runtime.libraryImport`.
    - `resolveRuntimeImports(...)` returns `runtimeImports.libraryImport` for both `CEM` and `PACKAGE_NAME` source modes.
    - `probeSSR(...)` must derive `available` from resolved runtime import loadability instead of unconditional success.
  - For Lit CEM SSR projects, `adapterOptions.runtime.libraryImport` is required.
- Rationale:
  - Server-side Lit rendering depends on deterministic library registration import.
  - Probe signals must reflect actual runtime wiring so mode signaling remains machine-verifiable.

## DEC-2026-05-03-LIT-SSR-HYDRATE-SUPPORT-OWNED-BY-ADAPTER-SSR-ENTRY

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Decision:
  - `@qwik-custom-elements/adapter-lit/ssr` must load `@lit-labs/ssr-client/lit-element-hydrate-support.js` at module entry.
  - Generated Lit SSR runtime modules continue to import `@qwik-custom-elements/adapter-lit/ssr` before importing the Lit component library, so client-side Lit upgrade sees hydrate support before custom elements register.
- Rationale:
  - Declarative Shadow DOM emitted by `@lit-labs/ssr` must be hydrated, not re-rendered from scratch on client upgrade.
  - Owning hydrate-support import in the adapter SSR entrypoint keeps the requirement adapter-local and automatic for generated SSR runtimes.

## DEC-2026-05-03-LIT-SSR-RUNTIME-BRIDGE-NO-ARG-CONTRACT

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Decision:
  - Generated Lit SSR runtime modules must import only `createLitSSRComponent` from `@qwik-custom-elements/adapter-lit/ssr` and instantiate bridge with no renderer argument (`createLitSSRComponent()`).
  - Generated runtime shape `createLitSSRComponent(renderComponentSsrHtml)` is removed from adapter template and generated demo outputs.
- Rationale:
  - Removes misleading external renderer-injection contract from generated surface and keeps SSR renderer ownership adapter-internal.
  - Reduces contract ambiguity ahead of true Lit SSR bridge implementation work.

## DEC-2026-04-29-STENCIL-GENERATED-NAMESPACE-PATHS

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Decision:
  - Stencil generated outputs in `qwik-demo` are namespaced under `apps/qwik-demo/src/generated/stencil/`.
  - SSR output path is `apps/qwik-demo/src/generated/stencil/ssr`.
  - CSR output path is `apps/qwik-demo/src/generated/stencil/csr`.
  - Stencil demo routes must import generated surfaces from these namespaced paths.
  - Legacy root-level Stencil generated paths `apps/qwik-demo/src/generated/ssr` and `apps/qwik-demo/src/generated/csr` are removed and no longer authoritative.
- Rationale:
  - Keeps Stencil and Lit generated surfaces clearly partitioned under `apps/qwik-demo/src/generated/*`.
  - Prevents path ambiguity now that both adapters emit multi-mode outputs.
  - Makes route wiring deterministic and discoverable for future tracer-bullet work.

## DEC-2026-04-29-ADAPTER-BRIDGE-VARIABLE-NAMING

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Decision:
  - When `libraryName` is provided in adapter generation inputs, generated bridge variable names follow `{PascalCase(libraryName)}{mode}BridgeComponent` — e.g. `test-stencil-lib` → `TestStencilLibSSRBridgeComponent` / `TestStencilLibCSRBridgeComponent`.
  - When `libraryName` is absent, adapters fall back to their existing generic names (`GeneratedStencilComponent`, `GeneratedStencilCSRComponent`, `GeneratedLitComponent`, `GeneratedLitCSRComponent`).
  - PascalCase conversion splits on hyphens and underscores: each segment is title-cased and joined.
  - This naming logic is adapter-owned (not core-owned) and is implemented identically but independently in each adapter.
- Rationale:
  - Library-scoped bridge names prevent symbol collisions when multiple generated library outputs coexist in the same demo/app.
  - Keeping the fallback preserves backward compatibility for existing project configs that omit `libraryName`.
  - Adapter-ownership of the naming rule is consistent with DEC-2026-04-20-ADAPTER-OWNED-GENERATED-OUTPUT.

## DEC-2026-04-29-OPTIONAL-LIBRARY-NAME-CONTRACT

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Decision:
  - Core generator project config supports optional `projects[].libraryName`.
  - When provided, core passes `libraryName` through to adapter `createGeneratedOutput(...)` inputs without imposing naming behavior in core.
  - When omitted, generation behavior remains unchanged for backward compatibility.
- Rationale:
  - Deterministic generated-surface naming needs library identity available to adapters, but framework-specific naming rules remain adapter-owned.
  - Keeping the field optional avoids breaking existing project configs during migration.

## DEC-2026-04-28-LIT-SSR-ADAPTER-SUBPATH-GATE

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Decision:
  - Lit projects that are intended to emit SSR-capable generated runtime surfaces must target `@qwik-custom-elements/adapter-lit/ssr` as `adapterPackage`.
  - Using root `@qwik-custom-elements/adapter-lit` is treated as client-capable fallback mode and must not be relied on for SSR runtime surface generation.
- Rationale:
  - The root Lit adapter entrypoint intentionally reports SSR unavailable, which downgrades generation to fallback behavior and omits SSR runtime bridge files.
  - SSR bridge contract ownership for Lit lives under adapter-lit SSR subpath and should be explicit in project configuration to keep mode signaling deterministic.

## DEC-2026-04-28-STENCIL-WRAPPER-MODE-GATE

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/43
- Decision:
  - SSR wrapper generation mode in `createGeneratedOutput` is gated on `hasHydrateRuntime` (whether `runtimeImports.hydrateImport` is a non-empty string), not on `ssrAvailable` (the runtime probe result).
  - The probe result is retained for diagnostics and reporting only and must not influence code generation decisions.
- Rationale:
  - The hydrate module cannot be dynamically imported inside the generator process even when it is correctly configured. Using the probe result as a capability gate causes permanent CSR-only wrapper generation regardless of consumer config intent.
  - Config presence is the correct authoritative signal because it reflects deliberate consumer intent, while probe availability is an execution-environment artifact.

## DEC-2026-04-20-ADAPTER-OWNED-GENERATED-OUTPUT

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Decision:
  - Core owns source discovery, CEM parsing, runtime-resolution orchestration, SSR capability probing, and adapter-hook coordination.
  - Adapters own the full generated file set for their projects, including generated barrels, runtime helper modules, wrapper modules, file extensions, and framework-specific SSR/container integration.
  - Core exposes typed parsed component metadata to adapters through a primary adapter generation contract instead of shaping framework-specific output itself.
  - Core must not branch on adapter identity to decide generated file content, filenames, exports, or fallback wrapper generation.
- Rationale:
  - Keeps framework-specific code generation inside adapter domains instead of leaking it into core.
  - Preserves a single authoritative metadata model while still letting adapters control their generated surface.
  - Gives the architecture an enforceable ownership boundary that can be validated with tests.

## DEC-2026-04-09-ROOT-E2E-COMMAND-SURFACE

- Status: Accepted
- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/25
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/28
- Decision:
  - The monorepo uses root Turbo-orchestrated e2e commands (`pnpm e2e`, `pnpm e2e:install`) as the canonical local browser-validation entrypoint.
  - Every workspace package must expose an `e2e` script. Packages without e2e coverage must use explicit no-op scripts.
- Rationale:
  - Prevent missing-script failures in root-level orchestration.
  - Keep contributor validation command surface deterministic and CI-ready.
