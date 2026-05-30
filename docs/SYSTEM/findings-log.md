# Findings Log

## 2026-05-30 - Lit SSR happy-path proof: complete route map and reproducible end-to-end validation

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/49
- Finding:
  - The Lit SSR happy path is fully proven end-to-end across two demo routes (`/lit/ssr/bridge` and `/lit/ssr/wrappers`), eight Playwright tests, and two generator-level integration tests (SSR + CSR real adapter-lit path).
  - Happy-path proof dimensions:
    1. **Server response contains DSD**: `GET /lit/ssr/bridge` returns HTML with `q:render="ssr"`, `<template shadowrootmode="open">`, prop-derived shadow content (`data-size="md"`), and light-DOM slot content. Test: `lit ssr bridge returns server-rendered lit html`.
    2. **Hydration non-duplication**: Shadow DOM count is exactly 1 after Lit's first async update when `@lit-labs/ssr-client/lit-element-hydrate-support.js` is loaded before element registration. Tests: `lit ssr bridge: shadow DOM is not double-rendered after hydration`, `lit ssr wrappers: shadow DOM is not double-rendered after hydration`.
    3. **Slot stability after signal change**: Light-DOM slot content stays inside `<de-alert>` and is not duplicated when Qwik signals trigger route re-render. Tests: `lit ssr bridge: light DOM slot content is not duplicated after signal change`, `lit ssr wrappers: light DOM slot content is not duplicated after signal change`.
    4. **Full interaction contract (bridge)**: Event delivery, handler toggling, debounced count increments, prop reactivity (size updates). Test: `lit ssr bridge interaction contract: toggles handler and increments active counters`.
    5. **Full interaction contract (wrappers)**: Same interaction dimensions as bridge, plus host-instance stability across prop updates, footer separator rendering, named-slot placement. Test: `lit ssr wrappers route renders generated wrapper hosts`.
    6. **Mode signal**: Generated `index.ts` exports `generatedMode = 'ssr' as const` for SSR path; `generatedMode = 'csr' as const` for CSR/fallback path. Proven in generator-level integration tests in `packages/core/src/__tests__/generator.test.ts`.
  - Reproducibility command: `pnpm e2e` from repo root runs all 18 tests (Lit + Stencil); Lit SSR-specific subset passes in under 5 seconds.
  - All 18 e2e tests pass (10 Lit + 8 Stencil): `pnpm typecheck && pnpm test && pnpm build && pnpm lint && pnpm e2e` all green.
- Durable guidance:
  - Treat these eight Playwright tests plus two generator-level integration tests as the canonical Lit SSR happy-path proof gate. Any regression in any dimension invalidates the happy-path claim.
  - The SSR proof for Lit uses `<template shadowrootmode="open">` (DSD), not `class="hydrated"` (Stencil). These are the distinguishing SSR markers for the two adapters.
  - `generatedMode` constant in generated `index.ts` is the machine-verifiable mode signal; `ssrCapabilities.available` in `generated-run-summary.json` is the generator-level probe signal. Both must align.

## 2026-05-16 - Lit SSR wrapper-route completion requires interaction/stability and DSD-specific proof

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/47
- Finding:
  - For `/lit/ssr/wrappers`, interaction and stability coverage requires the same behavioral dimensions as CSR wrappers (event delivery, handler switching, prop reactivity, slot/content rendering) PLUS SSR-specific dimensions: DSD non-duplication after hydration, and slot-content stability after signal changes.
  - The SSR-specific tests require `addInitScript` interception of `customElements.define` to measure shadow DOM count immediately after Lit's first update.
- Durable guidance:
  - Use CSR wrappers tests as the behavioral baseline and add two SSR-specific coverage items: (1) shadow DOM count === 1 after first Lit update (hydrate-support loaded before define), (2) slot content not duplicated after signal-triggered re-render.
  - Model: `apps/qwik-demo/e2e/lit-smoke.spec.ts` — "lit ssr wrappers: shadow DOM is not double-rendered after hydration" and "lit ssr wrappers: light DOM slot content is not duplicated after signal change".

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/46
- Finding:
  - Lit CSR generated wrappers that forward named slots as raw Qwik `<Slot name="..." />` can fail to place footer content into Lit shadow slot outlets on `/lit/csr/wrappers`.
  - Wrappers must forward named slots through native `slot="..."` wrappers (for example `<span slot="footer" style={{ display: 'contents' }}>`) so browser slot distribution can target Lit shadow DOM outlets.
  - If generated wrappers use native slot wrappers, they must disable bridge-side named-slot wrapper generation for the same wrapper path (`slots={undefined}`) to avoid duplicate slotted nodes.
- Durable guidance:
  - For generated Lit CSR wrappers, emit default slot forwarding with `<Slot />` and named-slot forwarding with native `slot` wrappers around `<Slot name="..." />`.
  - In generated wrappers that already provide native named-slot wrappers, pass `slots={undefined}` into the CSR bridge to keep a single source of slot wrapping.
  - E2E coverage for `/lit/csr/wrappers` and `/lit/csr/bridge` must assert named footer slot node presence and footer container/separator rendering structure, not only text presence.

## 2026-05-16 - CEM private members must not leak into generated wrapper prop interfaces

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/46
- Finding:
  - CEM `members` entries with `privacy: "private"` can leak implementation-only fields (for example `#clicks`) into generated typed wrapper props if core metadata extraction does not filter by privacy.
  - This creates incorrect public wrapper contracts and can expose non-bindable/internal element state as if it were a supported prop.
- Durable guidance:
  - At core CEM parsing stage, ignore `members` fields where `privacy === "private"` before constructing adapter-facing prop metadata.
  - Keep privacy filtering core-owned so all adapters inherit the same contract guardrail without per-adapter duplication.

## 2026-05-16 - Lit CSR wrapper-route completion requires interaction/stability proof, not host-presence smoke

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/46
- Finding:
  - For `/lit/csr/wrappers`, asserting only generated host presence (`de-button` / `de-alert`) is insufficient to claim wrappers-route completion.
  - Durable parity proof must validate wrapper-surface behavior dimensions directly: event delivery (triple-click), handler switching, prop reactivity (`size` updates), host stability across prop updates, and slot/content rendering.
- Durable guidance:
  - Keep bridge-route interaction contract as baseline and require wrappers-route e2e assertions for all listed behavior dimensions before checking interaction/stability acceptance criteria complete.
  - Treat unverified dimensions as remaining scope even when route wiring and host rendering already pass.

## 2026-05-05 - Lit SSR raw-response proof uses DSD `shadowrootmode` attribute, not `class="hydrated"`

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Finding:
  - Stencil SSR raw-response assertions use `class="hydrated"` on the host element as SSR proof. Lit SSR does not add `class="hydrated"`; instead, server-rendered Lit output contains `<template shadowrootmode="open">` inside the host element (Declarative Shadow DOM).
  - Shadow DOM internal content (e.g. `data-size="md"` from rendered `<button data-size=${this.size}>`) appears inside the `<template>` block. Light DOM slot content (default and named) appears between the `</template>` and `</tag>`.
  - Lit has no global `__qce_lit_client_setup_done__` equivalent marker; the "no client-setup flags" assertion for Lit routes checks stencil flag absence instead.
- Durable guidance:
  - For Lit SSR raw-response e2e: assert `q:render="ssr"` present, custom-element host tag with serialized props, `<template shadowrootmode="open">` present, shadow DOM content (prop-derived attributes), and light DOM slot content.
  - Model: `apps/qwik-demo/e2e/lit-smoke.spec.ts` — "lit ssr bridge returns server-rendered lit html".
  - Model: `apps/qwik-demo/e2e/stencil-smoke.spec.ts` — "stencil ssr bridge returns server-rendered stencil html" (for Stencil parity comparison).

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Finding:
  - Returning `probeSSR().available = true` unconditionally in Lit SSR entrypoint hides runtime wiring failures and weakens deterministic mode signaling.
  - Lit SSR adapter needs explicit runtime import lifecycle parity (`validateProject`, `resolveRuntimeImports`, `probeSSR`) so server-side element registration import can be validated/resolved/probed consistently.
- Durable guidance:
  - Require `adapterOptions.runtime.libraryImport` for Lit CEM SSR projects.
  - Resolve `runtimeImports.libraryImport` in adapter hook flow and pass that into probe.
  - Probe availability by attempting to load resolved runtime import; report `false` on missing/invalid imports.

## 2026-05-03 - Lit SSR must avoid `unsafeHTML()` and must load hydrate support before client element upgrade

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Finding:
  - Passing `<my-element ...></my-element>` through Lit `unsafeHTML()` during SSR bypasses `@lit-labs/ssr` element renderer lookup, which defeats true Lit SSR ownership and can collapse back to raw HTML behavior.
  - When Lit Declarative Shadow DOM is emitted server-side, client upgrade needs `@lit-labs/ssr-client/lit-element-hydrate-support.js` loaded before Lit custom elements are defined; otherwise client upgrade duplicates shadow DOM content instead of hydrating the SSR output.
- Durable guidance:
  - Build Lit SSR input as a static template-string array passed to `html(...)`, not through `unsafeHTML()`.
  - Load Lit hydrate support from the adapter SSR entrypoint so generated SSR runtimes get correct client hydration behavior without route-local patches.

## 2026-05-03 - Lit SSR generated runtime should not expose renderer-injection argument

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Finding:
  - Generated Lit SSR runtime shape `createLitSSRComponent(renderComponentSsrHtml)` creates false contract expectation that SSR renderer is consumer-supplied, while adapter owns SSR rendering path.
  - Keeping renderer helper in generated contract surface obscures adapter ownership boundaries and complicates parity work planning.
- Durable guidance:
  - Generated Lit SSR runtime should import only `createLitSSRComponent` from `@qwik-custom-elements/adapter-lit/ssr` and call it with no arguments.
  - Keep renderer implementation details internal to adapter SSR entry until true SSR path lands.

## 2026-04-29 - Stencil generated outputs should stay under a dedicated generated/stencil namespace

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Finding:
  - Keeping Stencil outputs at root-level generated paths (`generated/ssr`, `generated/csr`) creates mixed adapter surfaces alongside Lit outputs and increases import ambiguity in demo routes.
  - Migrating to `apps/qwik-demo/src/generated/stencil/(ssr|csr)` keeps Stencil surfaces explicit and prevents accidental cross-adapter path coupling.
- Durable guidance:
  - Treat `apps/qwik-demo/src/generated/stencil/ssr` and `apps/qwik-demo/src/generated/stencil/csr` as canonical Stencil generated locations.
  - Remove and avoid reintroducing `apps/qwik-demo/src/generated/ssr` and `apps/qwik-demo/src/generated/csr`.
  - Route-level Stencil imports should always reference the namespaced `generated/stencil/*` paths.

## 2026-04-29 - Generated bridge variable naming must be adapter-owned and library-scoped

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Finding:
  - Without `libraryName`-derived bridge variable names, all stencil and Lit SSR/CSR bridge symbols use a single generic name (`GeneratedStencilComponent`, etc.) per adapter. When multiple library outputs coexist in the same app this causes symbol shadowing and import resolution failures.
  - Adding `toBridgeComponentName(libraryName, mode, fallback)` in each adapter resolves this cleanly because adapters control generated-file content (per DEC-2026-04-20).
- Durable guidance:
  - Keep naming helpers (`toPascalCase`, `toBridgeComponentName`) inside adapter packages, not core.
  - The fallback-to-generic pattern is the correct compatibility strategy for configs that don't supply `libraryName`.
  - Ensure both adapter-level contract tests and generated runtime templates are updated together when bridge symbol names change.

## 2026-04-29 - libraryName should flow as additive adapter context, not as core-owned naming logic

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Finding:
  - Introducing optional `projects[].libraryName` in core config enables deterministic adapter naming work while keeping core framework-agnostic.
  - Passing `libraryName` directly to `createGeneratedOutput(...)` is backward-compatible because adapters can ignore unknown/optional context fields.
- Durable guidance:
  - Keep `libraryName` optional during rollout to avoid breaking existing configs.
  - Keep naming-shape decisions in adapters; core should only transport neutral generation context.

## 2026-04-29 - Stencil SSR bridge factory name must stay aligned across adapter runtime and generated runtime templates

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/50
- Finding:
  - Renaming the adapter SSR factory export without updating generator SSR runtime templates leaves generated bridge modules on stale symbol imports and breaks deterministic generation contracts.
- Durable guidance:
  - Treat stencil SSR factory symbol renames as a contract change that must update both adapter runtime export and generator-emitted runtime module templates in the same slice.
  - Regenerate tracked demo/runtime outputs immediately after template rename so checked-in generated files match the active adapter export.

## 2026-04-29 - Lit CSR bridge tag exports should be consumed as validated markup or intrinsic tags, not nullable JSX component aliases

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/45
- Finding:
  - Generated Lit CSR bridge helpers currently expose tag names as `string | null` (for deterministic invalid-input fallback). In Qwik TSX routes, assigning this value to a JSX component alias (for example `<BridgeTag />`) fails typecheck because nullable unions are not valid JSX element types.
- Durable guidance:
  - For route consumption of generated CSR tag bridges, normalize nullable outputs before render.
  - Prefer either validated intrinsic-tag rendering or null-safe `dangerouslySetInnerHTML` binding in route-owned containers.
  - Keep generated bridge contracts unchanged; resolve render-shape adaptation at app integration boundary.

## 2026-04-28 - Lit CSR generated runtime bridge should be client-subpath owned and explicitly source-mapped in demo apps

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/45
- Finding:
  - For Lit CSR projects using root `@qwik-custom-elements/adapter-lit` fallback mode, generated output remains deterministic only when adapter-owned CSR runtime bridge surface is emitted (`runtime.ts`, `runtime-csr.generated.ts`) and wrappers consume bridge result (`Qwik* CsrTagFromBridge`) instead of ad hoc route constants.
  - In workspace-local app development, `@qwik-custom-elements/adapter-lit/client` must be mapped to source in both TypeScript paths and Vite aliases; otherwise subpath resolution can fail before package dist is built.
- Durable guidance:
  - Keep Lit CSR bridge contract adapter-owned at explicit `@qwik-custom-elements/adapter-lit/client` subpath.
  - For generated Lit CSR outputs, emit a runtime barrel and CSR runtime leaf, then consume that bridge from generated wrapper modules.
  - In local workspace apps, align `tsconfig` paths and Vite aliases for `@qwik-custom-elements/adapter-lit/client` the same way as other adapter subpaths.

## 2026-04-28 - Lit SSR generated runtime surface requires adapter SSR subpath selection

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/44
- Finding:
  - Configuring Lit SSR generation projects with root `@qwik-custom-elements/adapter-lit` causes deterministic fallback mode (`probeSSR().available === false`) and prevents emission of SSR runtime bridge files.
  - Configuring the same project with `@qwik-custom-elements/adapter-lit/ssr` enables adapter-owned SSR bridge contract generation (`runtime.ts`, `runtime-ssr.generated.ts`) and wrapper bridge consumption.
- Durable guidance:
  - For any Lit project that claims SSR-capable generated output, set `adapterPackage` to `@qwik-custom-elements/adapter-lit/ssr`.
  - Reserve root `@qwik-custom-elements/adapter-lit` for client-capable fallback output only.

## 2026-04-28 - Stencil SSR probe unavailability at generation time does not mean hydrate runtime is absent

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/43
- Finding:
  - `probeSSR()` returns `{ available: false }` during CLI generation even when the hydrate module is correctly configured, because the generator process cannot dynamically `import()` the hydrate package path at that time. Using the probe result to gate SSR wrapper generation mode causes all generated wrappers to emit `GeneratedStencilCSRComponent` regardless of config.
- Durable guidance:
  - Treat `ssrAvailable` (probe result) as a diagnostic/reporting signal only.
  - Use `hasHydrateRuntime` (whether `runtimeImports.hydrateImport` is a non-empty string in config) as the authoritative gate for SSR wrapper generation mode.
  - Never derive generation-time capability from runtime probe outcomes that cannot succeed in the generator process environment.

## 2026-04-28 - First-path Lit SSR e2e proof should assert both custom-element registration and rendered host presence

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/42
- Finding:
  - For Lit SSR bridge smoke coverage, route copy alone can pass while runtime registration fails silently. Durable first-path proof should assert both `customElements.get('<tag>')` availability and visible rendered host under route-owned wrapper selectors.
- Durable guidance:
  - In Lit first-path e2e tests, assert page-level route signals (heading/status) plus runtime readiness (`customElements.get(...) != null`) plus visible host render under deterministic wrapper ids.
  - Keep this smoke contract small and route-local; defer event-contract or richer interaction assertions to later Lit tracer bullets.

## 2026-04-28 - Lit SSR render contract should separate missing-input fallback from invalid-input hard failures

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/40
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/43
- Finding:
  - For Lit SSR adapter render contract, conflating absent `tagName` with invalid provided `tagName` hides contract violations and weakens deterministic diagnostics. Fallback and hard-failure paths should be distinct and testable.
  - Both blank strings (`'   '`) and non-string non-null values (e.g., `42`) must hit the same hard-failure path (`QCE_LIT_RUNTIME_TAGNAME_INVALID`) — proven by contract tests covering both branches.
- Durable guidance:
  - Treat absent `options.tagName` as explicit fallback (`null`) when the caller did not provide SSR tag input.
  - Treat provided invalid `tagName` values (non-string OR blank string) as hard failures with stable error code and deterministic message.
  - Keep this validation and diagnostics behavior adapter-owned (`adapter-lit`) so core remains framework-agnostic.
  - Contract test suite must cover all three input categories: null/undefined (fallback), blank string (hard error), non-string non-null (hard error), valid string (rendered HTML).

## 2026-04-22 - Generated Stencil wrapper setup should be page-level, while SSR-capable wrappers must keep SSR component surface

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/38
- Finding:
  - Generated wrapper bodies should not call `useGeneratedStencilClientSetup()` per wrapper; setup should be invoked once at route/page level. During this migration, preserving SSR-capable wrapper rendering through `GeneratedStencilComponent` is required to avoid wrapper-route interaction regressions.
- Durable guidance:
  - Keep generated wrapper templates free of setup-hook calls and import only the generated component factory.
  - Call generated setup hooks at page/route integration boundaries that own wrapper composition.
  - Do not couple setup-call relocation with generated-surface switching; in SSR-capable mode wrappers must remain on `GeneratedStencilComponent` unless explicitly changing capability mode contract.

## 2026-04-21 - Structured SSR capability output should explicitly mark client-only generation mode

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/34
- Finding:
  - Deterministic fallback diagnostics are useful for humans, but automation also needs a structured signal that distinguishes client-only CSR generation from SSR-capable generation.
- Durable guidance:
  - Emit a structured client-only mode flag on project SSR capability output when SSR is unavailable and client-capable generation still succeeds.
  - Keep existing SSR capability fields (`available`, `supportsSsrProbe`, `ssrRuntimeSubpath`) stable and additive for compatibility; prefer adding an explicit mode signal rather than overloading existing booleans.
  - Keep core framework-agnostic by consuming an explicit adapter-provided capability signal instead of deriving mode from framework-specific diagnostics.

## 2026-04-21 - Capability-specific generated surfaces should be documented when loader-only and SSR-capable Stencil outputs diverge

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/34
- Finding:
  - When loader-only and SSR-capable Stencil generation expose materially different runtime/component contracts, the distinction should be treated as a consumer-facing surface split rather than as an implementation detail hidden behind one shared bridge.
- Durable guidance:
  - Document separate CSR and SSR generated surfaces at the contract level when the loader-only path uses a dedicated CSR component factory and the SSR path uses a hydrate-backed SSR component factory.
  - Keep exact output paths as implementation detail unless the repository explicitly decides to freeze them as public API.
  - Demo routes that claim to validate CSR output must consume the CSR generated surface directly instead of aliasing SSR routes or SSR-generated modules.
  - Preserve interface parity across capability-specific surfaces for typed props, typed event bindings, slot projection, and client bootstrap.
  - When hydrate resolution fails but loader-based generation still succeeds, emit deterministic diagnostics that explicitly state SSR is unavailable while client-capable wrapper generation succeeded via the loader-only CSR surface.

## 2026-04-20 - Adapter-owned generation must include the full generated file set, not only runtime leaves

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/36
- Finding:
  - Once adapters are allowed to contribute generated runtime modules, the same ownership boundary should extend to wrapper modules and generated barrels as well; otherwise core still leaks framework-specific output shaping through file extensions, wrapper structure, export topology, or transitional fallback contracts.
- Durable guidance:
  - Treat adapter generation as a primary adapter contract, not as an "additional" write hook layered on top of core-owned output shaping.
  - Pass typed parsed component metadata from core into adapter generation hooks so adapters do not need to re-parse CEM files.
  - Do not let core branch on adapter identity to decide generated filenames, wrapper structure, export topology, or fallback wrapper generation.
  - Once every in-repo adapter has migrated, remove compatibility aliases and make core fail deterministically when `createGeneratedOutput` is missing so the ownership boundary stays enforceable.
  - Preserve the current consumer-facing generated surface during the ownership migration by letting adapters claim stable wrapper/barrel paths directly rather than relying on any generic core fallback generation.
  - If an adapter exposes multiple entrypoints that can be used as `adapterPackage` values, each relevant entrypoint must own the same stable generated filenames and exports so core never has to special-case subpaths to preserve compatibility.

## 2026-04-19 - Generated Stencil wrapper files should consume generated runtime setup and derive prop typing from CEM metadata

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Finding:
  - Once Stencil runtime setup is generated, per-component wrapper files should be emitted as generated `.tsx` Qwik components that consume `runtime.ts` for client bootstrap and derive their initial prop typing from CEM attribute/member metadata rather than collapsing to tag-name constants.
- Durable guidance:
  - Keep generated Stencil wrappers on the generated runtime surface instead of reintroducing app-local bridge helpers.
  - Preserve enough CEM component metadata in core generation to drive wrapper contracts, even if later slices add richer event or slot support.
  - Treat prop typing from CEM attributes and members as the baseline wrapper contract; layer event and slot metadata on top in later issue slices instead of blocking wrapper generation on full metadata parity.
  - When CEM event metadata is available, emit typed `onEvent$` wrapper props from that metadata and keep those Qwik event bindings out of the plain custom-element prop spread.
  - When SSR runtime is available, render generated Stencil wrappers through an adapter-owned generated SSR component and map typed `onEvent$` props into its `events` contract rather than forwarding those mapped handlers as generic wrapper-container props.
  - When CEM slot metadata is available, emit the default `<Slot />` plus deterministic named `<Slot name="..." />` projections so generated wrapper output stays aligned with declared component slots.

## 2026-04-19 - Generated Stencil runtime barrels should be the app-facing integration surface

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - When Stencil runtime imports resolve successfully, generation should emit a stable `runtime.ts` barrel that re-exports the generated client and SSR runtime helpers so consuming apps do not need manual wrapper modules.
- Durable guidance:
  - Keep the runtime barrel adapter-owned and generated alongside `runtime-csr.generated.ts` and `runtime-ssr.generated.ts`.
  - Prefer importing app bootstrap and SSR helpers from the generated runtime barrel instead of adding hand-written demo or app-local wrapper files.

## 2026-04-19 - Generated Stencil client bootstrap should depend on resolved loader imports, not source type

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - The generated Stencil client bootstrap is valid whenever the adapter has a resolved `loaderImport`, regardless of whether that import came from `PACKAGE_NAME` defaults or the explicit `CEM` runtime contract.
- Durable guidance:
  - Gate `runtime-csr.generated.ts` emission on the presence of a resolved loader import, not on the source type.
  - Keep `PACKAGE_NAME` and `CEM` client bootstrap output aligned when they resolve to equivalent runtime imports.

## 2026-04-19 - Generated Stencil runtime leaf filenames should make CSR vs SSR intent explicit

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - The generated Stencil client runtime leaf is easier to reason about when its filename explicitly signals that it is the client-side counterpart to `runtime-ssr.generated.ts`.
- Durable guidance:
  - Use `runtime-csr.generated.ts` for the generated client runtime leaf while keeping `runtime.ts` as the stable app-facing barrel when a single surface is sufficient.
  - Reserve `runtime-ssr.generated.ts` for SSR-only helpers and keep the client leaf loader-only.
  - If loader-only and SSR-capable generation later expose different component-factory contracts, prefer distinct capability-specific generated surfaces over forcing both modes through one shared bridge shape.

## 2026-04-19 - Adapter-specific generated runtime modules should use a generic core planned-write hook

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - Runtime import resolution can feed generated output without making core framework-specific by letting adapters contribute additional planned writes after core resolves source metadata, runtime imports, and SSR capability.
- Durable guidance:
  - Keep framework-specific generated runtime modules adapter-owned.
  - Let core expose only a generic planned-write extension point that passes project identity, resolved runtime imports, and other already-computed generation context.
  - Reuse the same resolved runtime import contract across validation, SSR probing, and generated runtime files so emitted code cannot drift from planning-time decisions.

## 2026-04-19 - Stencil runtime import resolution should stay adapter-owned and feed SSR probing

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - Stencil runtime import resolution is adapter-specific behavior: `PACKAGE_NAME` should derive conventional `<packageName>/loader` and `<packageName>/hydrate` defaults, explicit runtime overrides should win when present, and core should consume the adapter-resolved runtime inputs when invoking SSR probes.
- Durable guidance:
  - Keep Stencil runtime default resolution in `@qwik-custom-elements/adapter-stencil`, not in core.
  - Treat `CEM` runtime imports as explicit adapter options only.
  - Pass adapter-resolved runtime inputs into downstream adapter hooks so SSR probing and later generation behavior share one runtime-resolution contract.
  - Validate resolved `PACKAGE_NAME` loader imports before generation and fail with a loader-specific diagnostic when they cannot be resolved.
  - Treat unresolved `PACKAGE_NAME` hydrate imports as a non-fatal hydrate-specific diagnostic that downgrades SSR availability instead of aborting loader-only generation.

## 2026-04-19 - Stencil CEM runtime contract must validate loader import before generation

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/31
- Finding:
  - For `@qwik-custom-elements/adapter-stencil`, `CEM` source mode does not provide enough package context to infer the client runtime import safely, so the adapter must validate `adapterOptions.runtime.loaderImport` through a generation-time adapter hook before generation work begins.
- Durable guidance:
  - Require `adapterOptions.runtime.loaderImport` for Stencil `CEM` projects.
  - Allow `adapterOptions.runtime.hydrateImport` to remain optional so loader-only and SSR-fallback flows stay valid.
  - Keep core config loading adapter-agnostic and treat `adapterOptions` as opaque outside adapter-owned validation hooks.
  - Keep `PACKAGE_NAME` runtime fields as optional overrides on top of package-aware defaults rather than making them universally required.
  - When `PACKAGE_NAME` runtime overrides are provided explicitly, validate them as non-empty strings so bad override values fail before generation.

## 2026-04-12 - Adapter subpath type resolution should not depend on prebuilt dist during app typecheck

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/24
- Finding:
  - After moving adapter-stencil entrypoints to nested subpaths (for example `src/client/index.ts`), downstream app `check-types` can fail when TypeScript resolves package subpath types only via non-built `dist` artifacts.
- Durable guidance:
  - In workspace apps that consume local adapter subpaths, add explicit `tsconfig` `paths` mappings to source entrypoints (for example `@qwik-custom-elements/adapter-stencil/client`, `@qwik-custom-elements/adapter-stencil/ssr`, and `@qwik-custom-elements/adapter-lit/ssr`) so local typecheck is stable independent of prebuilt package outputs.
  - Keep Vite aliasing aligned with the same source entrypoints to avoid runtime/typecheck divergence.

## 2026-04-09 - Stencil hydrate import must stay server-only in Qwik demo bridge

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/24
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Finding:
  - `@qwik-custom-elements/test-stencil-lib/hydrate` statically imports Node `stream`, so client-reachable code must not use a top-level hydrate import, even when the hydrate path is generated from resolved runtime metadata.
- Durable guidance:
  - Keep Stencil hydrate loading behind SSR-only dynamic import boundaries in demo/runtime bridge code.
  - Direct top-level imports are safe for `@qwik-custom-elements/test-stencil-lib/loader` in client bootstrap paths.
  - Generated SSR bridge modules (for example `runtime-ssr.generated.ts`) must preserve the same `import(/* @vite-ignore */ moduleId)` pattern instead of converting hydrate resolution into a static import.
  - If removing `isServer` guards from client-reachable bridge modules, use a Vite-ignored module-id dynamic import (`await import(/* @vite-ignore */ moduleId)`) so hydrate is not traversed in client build.

## 2026-04-09 - Repo-wide format touches generated artifacts

- Sources:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/25
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/28
- Finding:
  - Running repo-wide `pnpm format` can touch generated/demo artifacts that are unrelated to the active PRD slice.
- Durable guidance:
  - Prefer path-scoped staging and commit-by-file for PRD task slices after full-repo formatting and feedback loops.
