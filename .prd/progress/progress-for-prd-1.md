# PRD-1 Progress Log

## 2026-04-20 - Issue #36 partial: promote adapter-owned generation to a primary contract

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/36
- Task completed:
  - Promoted `createGeneratedOutput` to the primary adapter-owned generation contract in core while keeping `createAdditionalPlannedWrites` as a compatibility alias for the current migration window.
  - Updated both `@qwik-custom-elements/adapter-stencil` and `@qwik-custom-elements/adapter-lit` entrypoints to export the new primary hook name and kept adapter tests aligned with the new contract.
  - Added focused core coverage proving that adapters exposing only `createGeneratedOutput` still drive planned writes through the generator.
- Key decisions made:
  - The strict ownership boundary should be expressed at the contract name and loader level, not only in adapter implementation details.
  - Core should prefer the primary adapter generation hook immediately, but preserve a legacy fallback alias until the rest of the ownership migration is complete.
  - This slice stays at the contract boundary only; package docs and any remaining cleanup of transitional naming stay as follow-up work for issue #36.
- Files changed:
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `packages/adapter-lit/src/generated-output.ts`
  - `packages/adapter-lit/src/index.ts`
  - `packages/adapter-lit/src/index.test.ts`
  - `packages/adapter-lit/src/ssr.ts`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "uses the primary adapter generation contract when the adapter exposes createGeneratedOutput"`
  - `pnpm --filter @qwik-custom-elements/adapter-stencil exec vitest run src/index.test.ts`
  - `pnpm --filter @qwik-custom-elements/adapter-lit run test`
- Remaining for issue #36:
  - Remove the transitional legacy alias after the remaining adapter-owned output migration is complete.
  - Tighten docs around the primary adapter generation surface once the full ownership refactor is ready to present as the stable public contract.

## 2026-04-20 - Issue #36 partial: move Lit barrel and wrapper ownership into adapter-lit and remove core fallback writes

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/36
- Task completed:
  - Added adapter-owned planned writes for `@qwik-custom-elements/adapter-lit` so both the root entrypoint and the `@qwik-custom-elements/adapter-lit/ssr` subpath now generate the stable `index.ts` barrel and per-component `*.ts` wrapper modules directly.
  - Removed the remaining generic core fallback generation path so `@qwik-custom-elements/core` now returns only adapter-planned writes instead of shaping wrapper filenames, wrapper contents, or barrel exports itself.
  - Added focused Lit adapter coverage plus updated core generator coverage to prove the stable Lit-generated surface still exists without relying on core-owned fallback writes.
- Key decisions made:
  - The ownership boundary is enforceable only when core emits no fallback wrapper or barrel files at all; adapter output must be the sole generated surface for adapter-backed projects.
  - Lit ownership must cover both the base adapter entrypoint and the SSR subpath so existing adapter package references keep producing the same filenames and exports.
  - Production builds for `adapter-lit` should exclude test sources while still exposing a deterministic package test command through the monorepo Vitest toolchain.
- Files changed:
  - `packages/adapter-lit/package.json`
  - `packages/adapter-lit/src/generated-output.ts`
  - `packages/adapter-lit/src/index.test.ts`
  - `packages/adapter-lit/src/index.ts`
  - `packages/adapter-lit/src/ssr.ts`
  - `packages/adapter-lit/tsconfig.json`
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/core/src/generator.ts`
  - `.prd/progress/progress-for-prd-1.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-lit run build`
  - `pnpm --filter @qwik-custom-elements/adapter-lit run test`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "falls back to CEM-only generation when adapter SSR is unavailable|loads the lit adapter SSR subpath package without fallback warning"`
- Remaining for issue #36:
  - Replace the transitional `createAdditionalPlannedWrites` shape with the stricter primary adapter generation contract described in the issue acceptance criteria.
  - Update package-level docs for the final adapter-owned output contract after the primary contract lands.

## 2026-04-20 - Issue #36 partial: move Stencil wrapper output ownership into adapter-stencil

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/36
- Task completed:
  - Moved generated Stencil wrapper module rendering behind `@qwik-custom-elements/adapter-stencil#createAdditionalPlannedWrites` so the adapter now owns wrapper filenames and wrapper content for Stencil components.
  - Changed core wrapper planning to consume adapter-owned wrapper writes first and emit only the remaining generic fallback wrappers for component tags not claimed by an adapter.
  - Added focused adapter coverage for adapter-owned Stencil wrapper writes while preserving the existing core generator surface and root-level validation loop.
- Key decisions made:
  - The ownership refactor can land incrementally by letting adapters claim consumer-facing wrapper outputs one adapter at a time without breaking the existing generated surface.
  - Core may still provide a generic fallback wrapper path for adapters that have not yet taken ownership, but it must stop branching on adapter identity to decide wrapper filenames or wrapper shape.
  - For Stencil, typed parsed component metadata should cross the core-to-adapter generation boundary directly so adapter-owned wrapper generation does not need to re-parse CEM files.
- Files changed:
  - `packages/core/src/generator.ts`
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `.prd/progress/progress-for-prd-1.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil exec vitest run src/index.test.ts`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #36:
  - Move generated barrel and wrapper ownership for Lit behind the same primary adapter generation contract.
  - Remove the remaining generic core fallback generation once each adapter owns its full generated file set.

## 2026-04-20 - PRD architecture sync: lock adapter-owned generated output boundary

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Task completed:
  - Synced the parent PRD with the architecture decisions that lock generated output ownership to adapters rather than core.
  - Added a system decision entry and supporting findings-log guidance for the stricter boundary: core orchestrates and passes typed parsed metadata, while adapters own generated barrels, runtime helpers, wrapper modules, and framework-specific output shape.
  - Reviewed existing PRD-1 child issues and concluded that this ownership refactor does not fit cleanly into the currently open Stencil wrapper slice or the already-closed contract/governance slices.
- Key decisions made:
  - The architecture rule is strict: core may read adapter metadata for orchestration, but it must not branch on adapter identity to shape generated output.
  - Adapter ownership covers the full generated file set, not only runtime leaves.
  - Migration-specific decisions stay out of the parent PRD sync; only architecture decisions were promoted.
- Files changed:
  - `docs/SYSTEM/decisions.md`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - PRD issue #1 body reviewed before sync
  - Current PRD-1 child issues reviewed via GitHub CLI
- Follow-up:
  - Created new PRD-1 child issue #36 for the cross-adapter ownership refactor rather than folding it into issue #33.

## 2026-04-20 - Planning sync: tighten issue #36 and pause issue #33 behind the ownership refactor

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issues:
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/36
  - https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Task completed:
  - Refined issue #36 acceptance criteria so the slice explicitly enforces the grilled architecture decisions around adapter-owned generated output.
  - Updated issue #33 so it is blocked by issue #36 before additional Stencil wrapper work resumes.
  - Synced the new architecture ownership decision into package-level docs for core and both adapters.
- Key decisions made:
  - Issue #36 should test the strict boundary itself rather than describing the refactor loosely.
  - Issue #33 is now intentionally paused behind the cross-adapter ownership work.
  - Package docs should state the ownership boundary explicitly, not rely only on system-level decision logs.
- Files changed:
  - `packages/core/README.md`
  - `packages/adapter-lit/README.md`
  - `packages/adapter-stencil/README.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - GitHub issue #36 reviewed before and after refinement
  - GitHub issue #33 reviewed before and after blocker update
  - Package entrypoints reviewed before package-doc sync

## 2026-04-20 - Issue #33 follow-up: restore bridge demo route and keep separate bridge plus wrappers e2e coverage

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Task completed:
  - Restored the `/stencil/ssr/bridge/` demo route to consume the generated bridge component from generated runtime output instead of constructing a local bridge inline.
  - Kept the new `/stencil/ssr/wrappers/` route coverage and added separate end-to-end coverage so bridge and wrappers paths are both validated rather than replacing one with the other.
  - Re-ran the full repository feedback loop on the current working tree and confirmed root-level format, typecheck, test, build, lint, and e2e all pass.
- Key decisions made:
  - The bridge route must keep validating the generated bridge surface directly.
  - Wrapper-route coverage is additive and must not replace bridge-route coverage.
- Files changed:
  - `apps/qwik-demo/src/routes/stencil/ssr/bridge/index.tsx`
  - `apps/qwik-demo/e2e/smoke.spec.ts`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #33:
  - Add consumer-facing documentation for generated wrapper artifact shape and usage.

## 2026-04-20 - Issue #33 partial: wire generated Stencil wrappers into the SSR demo route

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Task completed:
  - Added the required `/stencil/ssr/wrappers/` demo route and switched the focused Playwright contract test to validate that route instead of the older bridge-only path.
  - Updated generated Stencil SSR runtime output to export a generated adapter-owned `GeneratedStencilComponent` so checked-in wrapper files can reuse the existing SSR bridge contract instead of reintroducing a hand-written app-local bridge.
  - Updated generated Stencil wrapper output to map typed `onEvent$` props into the adapter SSR component `events` contract and keep those mapped event props out of wrapper-container passthrough so event handlers survive Qwik rerenders.
  - Regenerated the checked-in demo wrapper artifacts from stale tag-name constants to `.tsx` wrapper components aligned with the current generator contract.
- Key decisions made:
  - This slice stays on the demo integration path only; it does not widen into consumer-facing documentation in the same run.
  - SSR-capable generated Stencil wrappers should render through the generated adapter-owned SSR component instead of directly rendering the custom-element tag when custom-event wiring must survive SSR and client rerenders.
  - Generated `onEvent$` props that are mapped into the SSR bridge `events` contract must not also be forwarded onto the wrapper container as generic Qwik event props.
- Files changed:
  - `apps/qwik-demo/e2e/smoke.spec.ts`
  - `apps/qwik-demo/src/routes/stencil/ssr/wrappers/index.tsx`
  - `apps/qwik-demo/src/generated/de-alert.tsx`
  - `apps/qwik-demo/src/generated/de-alert-shadow.tsx`
  - `apps/qwik-demo/src/generated/de-button.tsx`
  - `apps/qwik-demo/src/generated/de-button-shadow.tsx`
  - `apps/qwik-demo/src/generated/runtime-ssr.generated.ts`
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/adapter-stencil/src/index.ts`
  - `.prd/progress/progress-for-prd-1.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "renders Stencil wrappers through the generated SSR component when hydrate runtime is available|generates a server runtime bridge from resolved PACKAGE_NAME hydrate imports"`
  - `pnpm --filter ./apps/qwik-demo exec playwright test e2e/smoke.spec.ts -g "stencil wrappers interaction contract"`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #33:
  - Add consumer-facing documentation for generated wrapper artifact shape and usage.

## 2026-04-19 - Issue #33 partial: preserve named-slot metadata in generated Stencil wrappers

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Task completed:
  - Extended core CEM parsing to preserve per-component slot metadata during Stencil wrapper generation.
  - Updated generated Stencil `.tsx` wrappers to emit deterministic named `<Slot name="..." />` projections alongside the default slot.
  - Deduplicated repeated slot names while keeping wrapper output stable across repeated generation runs.
- Key decisions made:
  - This slice stays at generated wrapper contract level only; it does not widen into the `/stencil/ssr/wrappers/` demo route migration or consumer-facing docs in the same run.
  - Generated Stencil wrappers should always include the default Qwik `<Slot />` and then append any named slots discovered from CEM metadata in sorted order.
  - Slot metadata should layer on top of the existing prop and event-derived wrapper contract rather than changing the wrapper component surface.
- Files changed:
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `.prd/progress/progress-for-prd-1.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "produces deterministic planned writes in dry-run mode without mutating files"`
- Remaining for issue #33:
  - Update the demo route at `/stencil/ssr/wrappers/` to consume generated wrappers end to end.
  - Add consumer-facing documentation for generated wrapper artifact shape and usage.

## 2026-04-19 - Issue #33 partial: generate typed Stencil event props from CEM metadata

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Task completed:
  - Extended core CEM parsing to preserve Stencil component event metadata alongside prop metadata during wrapper generation.
  - Updated generated Stencil `.tsx` wrappers to emit typed `onEvent$` props from CEM events.
  - Kept generated Qwik event bindings separate from element prop spreading so `onEvent$` handlers continue to flow through Qwik rather than being collapsed into generic custom-element props.
  - Added focused generator coverage for the emitted `QRL` event prop types and event-prop separation behavior.
- Key decisions made:
  - This slice stays at generated wrapper contract level only; it does not widen into named-slot metadata, demo route migration, or consumer docs in the same run.
  - Event metadata should layer on top of the existing attribute/member-derived prop typing instead of replacing the current wrapper shape.
  - Generated Stencil wrappers must keep Qwik event bindings out of the plain element prop bag whenever event props are present.
- Files changed:
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `.prd/progress/progress-for-prd-1.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #33:
  - Support named-slot metadata in generated wrappers.
  - Update the demo route at `/stencil/ssr/wrappers/` to consume generated wrappers end-to-end.
  - Add consumer-facing documentation for generated wrapper artifact shape and usage.

## 2026-04-19 - Issue #33 partial: generate typed Stencil wrapper components from CEM metadata

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/33
- Task completed:
  - Changed Stencil wrapper generation from tag-name constant files to generated `.tsx` Qwik wrapper components.
  - Retained per-component CEM metadata during generation so wrapper files can derive prop interfaces from declared attributes and fields.
  - Wired generated wrappers to the generated Stencil runtime barrel by calling `useGeneratedStencilClientSetup()` instead of assuming app-local bridge files.
  - Added focused generator coverage for the new wrapper file shape and typed prop output.
- Key decisions made:
  - This slice stays client-bootstrap-focused: wrappers consume the generated runtime barrel for custom-element registration, but do not widen into generated SSR bridge composition, event wiring, or named-slot projection in the same run.
  - Stencil wrapper files should be emitted as `.tsx` so the generated output can expose a real Qwik component surface instead of a string constant contract.
  - CEM attribute and member metadata are sufficient for a first prop-typing slice; event and slot metadata remain follow-up work for issue #33.
- Files changed:
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `.prd/progress/progress-for-prd-1.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core run check-types`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #33:
  - Generate event handler wiring from CEM event metadata instead of forwarding only element props and default children.
  - Support named-slot metadata in generated wrappers.
  - Update the demo route at `/stencil/ssr/wrappers/` to consume generated wrappers end-to-end.
  - Add consumer-facing documentation for generated wrapper artifact shape and usage.

## 2026-04-19 - Issue #32 follow-up: rename generated client runtime leaf to runtime-csr.generated.ts

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Renamed the generated Stencil client runtime leaf from `runtime.generated.ts` to `runtime-csr.generated.ts`.
  - Kept the stable generated barrel at `runtime.ts` and updated it to re-export the renamed client leaf.
  - Updated generator coverage, adapter documentation, and checked-in demo generated output to use the explicit CSR filename.
- Key decisions made:
  - The generated client runtime leaf should use an explicit `-csr` suffix to mirror the existing `-ssr` split and make the client-only contract obvious.
  - `runtime.ts` remains the stable consumer-facing import surface so app code does not need to care about the leaf filename.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/dist/index.qwik.mjs`
  - `packages/adapter-stencil/dist/index.qwik.cjs`
  - `packages/core/src/__tests__/generator.test.ts`
  - `apps/qwik-demo/src/generated/runtime.ts`
  - `apps/qwik-demo/src/generated/runtime-csr.generated.ts`
  - `packages/adapter-stencil/README.md`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil run build`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
- Remaining for issue #32:
  - None. This is a naming clarification follow-up on top of the already completed issue.

## 2026-04-19 - Issue #32 complete: consume generated Stencil runtime barrel in demo

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Extended the adapter-owned Stencil planned-write hook to emit `runtime.ts` as a generated runtime barrel alongside the existing client and SSR runtime modules.
  - Regenerated `apps/qwik-demo/src/generated/runtime.ts` and updated the Stencil SSR demo route to import its client setup and SSR render helper from generated runtime output directly.
  - Deleted the now-redundant demo-local wrapper files for Stencil client setup and SSR bridging.
  - Aligned core generator coverage and baseline planned-write assertions with the new runtime barrel shape.
- Key decisions made:
  - Generated runtime helpers should be consumed through a stable generated barrel instead of hand-written app-local wrapper modules.
  - The new `runtime.ts` file follows the same generated-file provenance header contract as the other emitted runtime files.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `apps/qwik-demo/src/routes/stencil/stencil-js-lib-ssr-component/index.tsx`
  - `apps/qwik-demo/src/generated/runtime.ts`
  - `apps/qwik-demo/src/generated/runtime.generated.ts`
  - `apps/qwik-demo/src/generated/runtime-ssr.generated.ts`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil run build`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "generates a runtime barrel for resolved Stencil runtime modules"`
  - `node packages/core/dist/cli.js --config qwik-custom-elements.config.json`
  - `pnpm --filter qwik-demo run build`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #32:
  - None. Acceptance criteria satisfied.

## 2026-04-19 - Issue #32 partial: generate SSR runtime bridge from resolved hydrate imports

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Extended the adapter-owned Stencil planned-write hook to emit `runtime-ssr.generated.ts` whenever a resolved hydrate import is available.
  - Kept the generated SSR bridge on a Vite-ignored dynamic import boundary so client builds do not traverse the Node-only hydrate runtime.
  - Updated the demo SSR component to consume the generated bridge instead of hardcoding the hydrate module id.
  - Documented the split between generated client and SSR runtime modules.
- Key decisions made:
  - Keep `runtime.generated.ts` loader-only because it is client-reachable.
  - Use a separate generated SSR bridge file for hydrate-backed `renderToString` behavior.
  - Preserve the existing dynamic-import safety pattern in generated SSR output instead of switching to a top-level hydrate import.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/README.md`
  - `packages/core/src/__tests__/generator.test.ts`
  - `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`
  - `apps/qwik-demo/src/generated/runtime.generated.ts`
  - `apps/qwik-demo/src/generated/runtime-ssr.generated.ts`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil run build`
  - `node packages/core/dist/cli.js --config qwik-custom-elements.config.json`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "generates a server runtime bridge from resolved PACKAGE_NAME hydrate imports"`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #32:
  - Audit whether any remaining consumer-facing runtime integration paths should move from manual demo helpers to generated runtime modules.
  - Decide whether the generated barrel should intentionally expose runtime helpers or keep them as explicit deep imports.

## 2026-04-19 - Issue #32 partial: generate CEM client runtime bootstrap from explicit loader imports

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Extended the adapter-owned Stencil planned-write hook so `runtime.generated.ts` is emitted for `CEM` projects when `adapterOptions.runtime.loaderImport` resolves successfully.
  - Added core generator coverage proving `CEM` projects now emit the same generated client bootstrap shape already used by `PACKAGE_NAME` projects.
  - Updated adapter documentation to describe generated client bootstrap emission in terms of resolved loader imports rather than source type.
- Key decisions made:
  - Reuse the existing resolved-runtime contract for generated client bootstrap emission instead of introducing a second CEM-specific output path.
  - Treat generated client bootstrap emission as loader-driven behavior; hydrate remains optional and continues to affect only SSR availability.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/README.md`
  - `packages/core/src/__tests__/generator.test.ts`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil run build`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
- Remaining for issue #32:
  - Consume resolved runtime imports in the remaining Stencil SSR bridge generation paths where runtime imports still remain implicit.
  - Update demo integration only if later runtime-import consumption changes the expected consumer path.

## 2026-04-19 - Issue #32 partial: generate PACKAGE_NAME client runtime bootstrap from resolved loader imports

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Added an adapter-owned planned-write hook so generated output can consume resolved runtime imports without teaching core Stencil-specific paths.
  - Generated `runtime.generated.ts` for Stencil `PACKAGE_NAME` projects when the loader import resolves successfully.
  - Wired the generated runtime module to `@qwik-custom-elements/adapter-stencil/client` and the resolved loader import, exporting `defineCustomElements`, `defineCustomElementsQrl`, and `useGeneratedStencilClientSetup`.
  - Kept loader-only fallback usable by generating the client runtime bootstrap even when hydrate resolution downgrades SSR availability.
- Key decisions made:
  - Keep generated runtime bootstrap emission adapter-owned behind a generic core planned-write extension point.
  - Limit this slice to the client bootstrap for `PACKAGE_NAME`; do not widen into CEM output wiring or SSR bridge generation in the same run.
  - Reuse the resolved loader import directly in generated output so validation, probing, and emitted code stay aligned.
- Files changed:
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/core/src/generator.ts`
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/README.md`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts -t "generates a client runtime bootstrap from resolved PACKAGE_NAME loader imports"`
  - `pnpm --filter @qwik-custom-elements/adapter-stencil run build`
- Remaining for issue #32:
  - Consume resolved runtime imports in generated output for the remaining Stencil source/runtime combinations, especially `CEM` and SSR bridge generation.
  - Update demo integration only if later generated runtime modules replace the current manual bridge imports.

## 2026-04-19 - Issue #32 partial: validate PACKAGE_NAME runtime imports before generation

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Validated resolved `PACKAGE_NAME` Stencil runtime imports before generation proceeds.
  - Treated unresolved loader imports as fatal generation errors with `QCE_STENCIL_RUNTIME_LOADER_RESOLVE_FAILED`.
  - Treated unresolved hydrate imports as non-fatal diagnostics: dropped the hydrate runtime import, recorded `QCE_STENCIL_RUNTIME_HYDRATE_RESOLVE_FAILED`, and preserved SSR fallback behavior.
  - Added adapter-level and core-level test coverage for the new loader-versus-hydrate diagnostic split.
  - Updated adapter documentation to explain loader fatality, hydrate downgrade behavior, and runtime validation timing.
- Key decisions made:
  - Keep Stencil-specific runtime resolution rules adapter-owned.
  - Inject Node-backed package-resolution helpers from core instead of importing Node builtins in the bundled adapter entrypoint.
  - Preserve loader-only generation as a valid success path when hydrate resolution fails.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `packages/adapter-stencil/README.md`
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/core/src/__tests__/config.test.ts`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil test -- --run src/index.test.ts`
  - `pnpm --filter @qwik-custom-elements/adapter-stencil run build`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/config.test.ts`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #32:
  - Consume resolved runtime imports in generated output where runtime imports still remain implicit.
  - Update demo integration only if later runtime-import consumption changes the expected consumer path.

## 2026-04-19 - Issue #32 partial: make SSR availability depend on resolved runtime imports

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Updated `@qwik-custom-elements/adapter-stencil` SSR probing to consume the resolved runtime imports it already receives.
  - Marked SSR as available only when both `loaderImport` and `hydrateImport` are present as non-empty strings.
  - Kept missing or blank hydrate input as an SSR-availability downgrade instead of a generation-time throw, preserving loader-only fallback flows.
  - Added adapter-stencil unit coverage for loader-missing, hydrate-missing, and blank-runtime probe cases.
- Key decisions made:
  - Keep this slice adapter-owned and probe-local rather than widening core summary or diagnostic contracts in the same run.
  - Treat missing runtime imports during SSR probing as capability detection, not as a second validation path.
  - Leave deterministic loader-vs-hydrate generation-time diagnostics for a later issue `#32` slice.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil test -- --run src/index.test.ts`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
  - `npm run format`
  - `npm run e2e`
- Remaining for issue #32:
  - Distinguish loader and hydrate resolution failures with deterministic generation-time diagnostics.
  - Document the full consumer-facing validation behavior in adapter docs once the remaining diagnostics land.
  - Update demo integration only if later runtime-resolution work changes the generated consumer path.

## 2026-04-19 - Issue #32 partial: resolve PACKAGE_NAME runtime defaults and feed SSR probing

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/32
- Task completed:
  - Added adapter-owned `resolveRuntimeImports(...)` handling in `@qwik-custom-elements/adapter-stencil`.
  - Derived PACKAGE_NAME runtime defaults as `<packageName>/loader` and `<packageName>/hydrate`.
  - Preserved explicit PACKAGE_NAME override precedence for `loaderImport` and `hydrateImport`.
  - Wired core generation to pass adapter-resolved runtime imports into adapter SSR probing.
  - Updated adapter-stencil documentation to describe default resolution, override precedence, and the probe input contract.
- Key decisions made:
  - Keep Stencil runtime import resolution adapter-owned rather than teaching core Stencil-specific defaults.
  - Reuse the adapter-resolved runtime import contract as the input to SSR probing so later capability and generation decisions do not diverge.
  - Keep this slice focused on runtime resolution and probe input plumbing; generation output changes remain for later issue #32 slices.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `packages/adapter-stencil/README.md`
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `docs/SYSTEM/findings-log.md`
  - `.prd/progress/progress-for-prd-1.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil test -- --run src/index.test.ts`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/generator.test.ts`
- Remaining for issue #32:
  - Distinguish loader and hydrate resolution failures with deterministic generation-time diagnostics.
  - Consume resolved runtime imports in generated output paths where runtime imports still remain implicit.
  - Update demo integration if resolved runtime inputs change the expected consumer path.

## 2026-04-19 - Issue #31 audit: acceptance criteria satisfied, issue closed

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/31
- Audit result:
  - Verified the implemented Stencil runtime import contract matches the issue acceptance checklist.
  - Confirmed `CEM` requires `adapterOptions.runtime.loaderImport` and allows optional `adapterOptions.runtime.hydrateImport`.
  - Confirmed `PACKAGE_NAME` supports optional runtime overrides for `loaderImport` and `hydrateImport`, while allowing package-aware defaults when omitted.
  - Confirmed generator-facing validation flows through the core adapter-validation hook without teaching core Stencil-specific option shapes.
  - Confirmed consumer-facing README examples cover both source types and required versus optional runtime fields.
  - Confirmed the checked-in demo config already uses the supported runtime path.
- Key decisions made:
  - Treat the previously noted "remaining" runtime import wiring work as issue `#32` scope because it concerns default resolution and precedence, not the source contract finalized by `#31`.
  - Leave `docs/SYSTEM/*` unchanged because this audit did not introduce new durable decisions or findings.
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil test -- --run src/index.test.ts`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/config.test.ts src/__tests__/generator.test.ts`
- Files changed:
  - `.prd/progress/progress-for-prd-1.md`
- Follow-up:
  - Continue Stencil runtime default-resolution and override-precedence work under issue `#32`.

## 2026-04-19 - Issue #31 partial: validate PACKAGE_NAME runtime override values

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/31
- Task completed:
  - Added adapter-stencil validation coverage for `PACKAGE_NAME` projects that rely on package-aware runtime defaults.
  - Rejected blank `adapterOptions.runtime.loaderImport` and `adapterOptions.runtime.hydrateImport` override values when consumers explicitly set those overrides for `PACKAGE_NAME` source mode.
  - Updated adapter-stencil README wording so the documented override contract matches the validation behavior.
- Key decisions made:
  - Keep `PACKAGE_NAME` ergonomic by allowing omitted runtime overrides to fall back to package-aware defaults.
  - Treat explicit runtime overrides as validated user input: when set, they must be non-empty strings.
  - Keep this validation adapter-owned in `@qwik-custom-elements/adapter-stencil` rather than teaching core about Stencil runtime option shapes.
- Files changed:
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `packages/adapter-stencil/README.md`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/adapter-stencil test -- --run src/index.test.ts`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #31:
  - Wire the runtime import contract through downstream generation/output behavior where imports are still implicit.
  - Expand consumer-facing examples if generation/output behavior changes the supported paths.

## 2026-04-19 - Issue #31 partial: enforce Stencil CEM loader import contract

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/31
- Task completed:
  - Added a generic adapter validation hook in core generation.
  - Enforced `adapterOptions.runtime.loaderImport` for Stencil `CEM` projects in `@qwik-custom-elements/adapter-stencil`.
  - Kept `adapterOptions.runtime.hydrateImport` optional so loader-only configurations stay valid.
  - Updated the checked-in demo config and adapter-stencil README to match the enforced contract.
- Key decisions made:
  - Keep core config loading adapter-agnostic and treat `adapterOptions` as opaque.
  - Validate the Stencil runtime contract through an adapter-owned hook during generation.
  - Treat the runtime contract as Stencil-specific adapter data under `adapterOptions`, not under `source`.
  - Keep `PACKAGE_NAME` runtime defaults for a later slice; this run only codified the `CEM` requirement and optional hydrate behavior.
- Files changed:
  - `packages/core/src/config.ts`
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/config.test.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `packages/adapter-stencil/README.md`
  - `qwik-custom-elements.config.json`
- Validation:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm e2e`
- Remaining for issue #31:
  - Codify `PACKAGE_NAME` runtime override behavior in validation and tests.
  - Expand consumer-facing documentation and examples for both source types.
  - Update any generation/output behavior once the runtime contract is consumed beyond adapter validation.

## 2026-04-19 - Issue #31 follow-up: restore adapter-owned validation boundary

- Parent PRD: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/1
- Child issue: https://github.com/DmitryEfimenko/qwik-custom-elements/issues/31
- Task completed:
  - Removed adapter-specific option types and exports from core.
  - Restored opaque `adapterOptions` handling in core config loading.
  - Kept the generic generation-time adapter validation hook in core.
  - Added Stencil-owned `validateProject(...)` coverage and repaired core generator/config fixtures around the new boundary.
- Key decisions made:
  - Core may orchestrate adapter validation, but must not understand adapter-specific option shapes.
  - Adapter-owned validation belongs at generation time, after adapter loading and before generation work.
- Files changed in this follow-up:
  - `packages/core/src/types.ts`
  - `packages/core/src/index.ts`
  - `packages/core/src/config.ts`
  - `packages/core/src/generator.ts`
  - `packages/core/src/__tests__/config.test.ts`
  - `packages/core/src/__tests__/generator.test.ts`
  - `packages/adapter-stencil/src/index.ts`
  - `packages/adapter-stencil/src/index.test.ts`
  - `docs/SYSTEM/findings-log.md`
- Validation:
  - `pnpm --filter @qwik-custom-elements/core check-types`
  - `pnpm --filter @qwik-custom-elements/core exec vitest run src/__tests__/config.test.ts src/__tests__/generator.test.ts`
  - `pnpm --filter @qwik-custom-elements/adapter-stencil check-types`
  - `pnpm --filter @qwik-custom-elements/adapter-stencil test`

## 2026-04-12 - PRD #1 / Child #24 - Remove useVisibleTask$ fallback from Stencil client setup (task slice: dev-mode timing reliability without useVisibleTask)

### Task completed

- Removed `useVisibleTask$` fallback from demo Stencil client hook in `apps/qwik-demo/src/components/stencil-lib-client.tsx`.
- Hardened `createStencilClientSetup()` in `packages/adapter-stencil/src/client/client-setup.ts` to reliably execute setup in dev mode by:
  - Making setup one-time guard promise-aware (track setup progress, not just completion).
  - Running setup immediately if document is already loaded (`document.readyState !== 'loading'`).
  - Fixing QRL fallback detection to correctly identify callable QRL objects via `$symbol$` marker.
  - Registering callable inputs behind a serializable registry ID to avoid non-serializable closure capture in QRL.
- Added corresponding unit test coverage proving immediate-execution path in `createStencilClientSetup.test.ts`.
- Updated demo app scripts to enable explicit dev-mode E2E (`e2e:dev`, `dev:e2e`) and preview-mode E2E (`e2e:preview`, `preview:e2e`) targeting.
- Updated Playwright config to branch webserver command based on `PLAYWRIGHT_RUNTIME` environment variable.
- Updated root `package.json` scripts for consistency (renamed `dev:qwik-demo` → `qwik-demo:dev`, added `qwik-demo:preview`).
- Removed debug logging (`console.log('handleFirstAlpha$')`) from demo route handler for cleaner test output.

### Key decisions

- Removed `useVisibleTask$` entirely rather than gating it behind a dev flag because adapter-side hardening proved sufficient for both runtimes.
- Used QRL marker detection (`$symbol$ in Object(...)`) as the safest fallback path check instead of broad type coercion.
- Kept setup as a single per-page initialization contract (one global marker, one promise that resolves to true).
- Preserved no-config dev/preview E2E split by using environment variable routing in Playwright instead of separate project definitions.

### Key findings

- Dev-mode timing race was caused by setup promise-state not being visible to repeated load-event callbacks; tracking the pending promise solved this.
- QRL objects carry a `$symbol$` property that uniquely identifies them; using this instead of property-checking on unions avoids type errors.
- App-side fallback was masking a real adapter issue: registry-based input storage and immediate-execution branch made the adapter sufficient without useVisibleTask.
- Direct async function input (without QRL wrapping) also works but QRL input is more robust for Qwik serialization, so kept QRL as primary path.

### Validation loops run

- `pnpm --filter qwik-demo run e2e:dev` (GREEN before/after changes)
- `pnpm --filter qwik-demo run e2e:preview` (GREEN before/after changes)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run build` (passed)
- `npm run lint` (passed)
- `npm run format` (passed)
- `npm run e2e` (passed)

### Files changed

- `apps/qwik-demo/package.json`
- `apps/qwik-demo/playwright.config.ts`
- `apps/qwik-demo/src/components/stencil-lib-client.tsx`
- `apps/qwik-demo/src/routes/stencil/stencil-js-lib-ssr-component/index.tsx`
- `package.json`
- `packages/adapter-stencil/src/client/client-setup.ts`
- `packages/adapter-stencil/src/client/client-setup.test.ts`
- `turbo.json`

### Blockers / notes for next iteration

- No blockers for this slice.
- Dev-mode and preview-mode E2E validation are now part of the standard feedback loop and can be run explicitly via `pnpm --filter qwik-demo run e2e:dev` and `pnpm --filter qwik-demo run e2e:preview`.

## 2026-04-12 - PRD #1 / Child #24 - Narrow adapter packaging to stencil-only Qwik library mode

### Task completed

- Re-evaluated whether both adapter packages need Qwik-library packaging based on their actual runtime role and consumer surfaces.
- Kept `@qwik-custom-elements/adapter-stencil` on Qwik-library packaging because it publishes Qwik runtime code through:
  - `@qwik-custom-elements/adapter-stencil/client`
  - `@qwik-custom-elements/adapter-stencil/ssr`
- Reverted `@qwik-custom-elements/adapter-lit` to a plain TypeScript package because its current surface is metadata plus placeholder SSR string generation, not published Qwik runtime APIs.
- Added package-export-aware workspace fallback loading in core so local adapter resolution no longer assumes legacy `dist/index.js` paths.
- Fixed `createStencilClientSetup(...)` to avoid capturing non-serializable function inputs inside a QRL closure by storing inputs behind a serializable registry id.
- Updated adapter-stencil client setup tests to execute the real resolved QRL callback path used after Qwik transform.

### Key decisions

- Treated adapter packaging as capability-driven, not package-name-driven: only packages that publish Qwik runtime entrypoints should use Qwik library output.
- Kept the stencil adapter Qwik-library build narrow to the package that actually exports `$`/`component$`/`useTask$`-based runtime surfaces.
- Avoided converting lit prematurely; defer Qwik-library packaging there until it exposes real Qwik runtime APIs rather than placeholder SSR helpers.
- Fixed the stencil client setup issue at the runtime boundary instead of loosening tests around non-serializable closure capture.

### Key findings

- `adapter-stencil` truly needs optimizer-recognized output because its published client/SSR subpaths are consumed as Qwik runtime code.
- `adapter-lit` does not currently need a `qwik` field or `.qwik.mjs` entry because consumers only use plain metadata and string-based SSR placeholder helpers.
- Core workspace-local adapter loading needed to resolve package exports, otherwise local monorepo fallback logic remained coupled to stale dist-path assumptions.
- The stencil client setup implementation had a real Qwik serialization bug: capturing a direct async callback inside `$()` fails once the package is built/tested in Qwik-library mode.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/adapter-lit run build` (passed)
- `pnpm --filter @qwik-custom-elements/adapter-stencil run build` (passed)
- `pnpm --filter @qwik-custom-elements/adapter-stencil run test` (RED -> GREEN during fix)
- `pnpm --filter @qwik-custom-elements/core run test` (passed)
- `npm run typecheck` (passed)
- `npm run build` (passed)
- `npm run test` (passed)
- `npm run lint` (passed)
- `npm run format` (passed)
- `npm run e2e` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `packages/adapter-lit/package.json`
- `packages/adapter-stencil/package.json`
- `packages/adapter-stencil/src/client/client-setup.ts`
- `packages/adapter-stencil/src/client/client-setup.test.ts`
- `packages/adapter-stencil/vite.config.ts`
- `packages/core/src/generator.ts`
- `pnpm-lock.yaml`

### Blockers / notes for next iteration

- No blockers for this slice.
- Turbo still warns that some build tasks do not declare outputs; that is separate follow-up cleanup and was left unchanged here.

## 2026-04-12 - PRD #1 / Child #24 - Move adapter-stencil client runtime into dedicated client directory

### Task completed

- Moved adapter client runtime surface from mixed locations into a dedicated client tree:
  - added `packages/adapter-stencil/src/client/index.ts`
  - moved client setup implementation to `packages/adapter-stencil/src/client/client-setup.ts`
  - moved client setup tests to `packages/adapter-stencil/src/client/client-setup.test.ts`
  - removed legacy files:
    - `packages/adapter-stencil/src/client.ts`
    - `packages/adapter-stencil/src/ssr/client-setup.ts`
    - `packages/adapter-stencil/src/ssr/client-setup.test.ts`
- Updated adapter/client wiring and consumer resolution:
  - `packages/adapter-stencil/package.json` client export now points to `dist/client/index.*`
  - removed client setup re-export from `packages/adapter-stencil/src/ssr/index.ts`
  - updated demo Vite alias to `packages/adapter-stencil/src/client/index.ts`
  - added qwik-demo TypeScript path mappings for `@qwik-custom-elements/adapter-stencil/client` and `/ssr` source entries.

### Key decisions

- Kept exactly one document listener for setup wiring (`load`) to avoid duplicate callback execution paths during page bootstrap.
- Kept one-time setup guard (`__qce_stencil_client_setup_done__`) and moved reliability log to the actual once-only execution path (`stencilClientSetup:executedOnce`).
- Preserved compatibility by allowing `createStencilClientSetup(...)` to accept both QRL-style input (`resolve()`) and direct async callback input.

### Key findings

- In this workspace, `qwik-demo` `check-types` can fail if adapter subpath types resolve only through non-built `dist` artifacts after entry-point moves.
- Adding explicit `paths` mappings in `apps/qwik-demo/tsconfig.json` for adapter subpaths removes that fragility while keeping dev aliasing consistent with Vite runtime resolution.

### Validation loops run

- `npm run format` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run build` (passed)
- `npm run lint` (passed)
- `npm run e2e` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `apps/qwik-demo/tsconfig.json`
- `apps/qwik-demo/vite.config.ts`
- `packages/adapter-stencil/package.json`
- `packages/adapter-stencil/src/client/index.ts`
- `packages/adapter-stencil/src/client/client-setup.ts`
- `packages/adapter-stencil/src/client/client-setup.test.ts`
- `packages/adapter-stencil/src/ssr/index.ts`
- `packages/adapter-stencil/src/ssr/client-setup.ts` (deleted)
- `packages/adapter-stencil/src/ssr/client-setup.test.ts` (deleted)
- `docs/SYSTEM/findings-log.md`

### Blockers / notes for next iteration

- No blockers for this slice.
- There are unrelated pending workspace changes outside this slice that were intentionally left untouched.

## 2026-04-09 - PRD #1 / Child #24 - Remove isServer guard from demo bridge (task slice: client-safe hydrate import rewrite)

### Task completed

- Removed `isServer` usage from `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`.
- Updated demo `renderToString(...)` bridge import to use a Vite-ignored module-id dynamic import for hydrate:
  - `const hydrateModuleId = '@qwik-custom-elements/test-stencil-lib/hydrate'`
  - `await import(/* @vite-ignore */ hydrateModuleId)`
- Kept existing route/runtime API unchanged (`StencilJsLibSSRComponent`, `useStencilClientSetup`).

### Key decisions

- Kept this to one task slice under child `#24`: remove `isServer` guard without changing public component usage.
- Did not keep split server helper module attempt because client build still traversed hydrate dependency graph in this setup.
- Chose Vite-ignored module-id dynamic import as the minimal reliable boundary for keeping Node-only hydrate code out of browser bundle while preserving SSR runtime behavior.

### Key findings

- In this demo bridge shape, removing the SSR guard without import strategy changes causes client build/e2e failure due to `stream` from hydrate.
- Splitting hydrate logic into a separate `.server` module and importing it dynamically from a client-reachable module was insufficient here.
- Vite-ignored module-id dynamic import restored deterministic success while allowing `isServer` removal.

### Validation loops run

- `pnpm --filter qwik-demo run build` (RED -> GREEN during fix)
- `pnpm --filter qwik-demo run e2e` (RED -> GREEN during fix)
- `npm run format` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run build` (passed)
- `npm run lint` (passed)
- `npm run e2e` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`

### Blockers / notes for next iteration

- No blocker for this slice.
- If future adapter packaging makes hydrate consumable through an explicit server-only export contract, this demo bridge import pattern can be simplified again.

## 2026-04-09 - PRD #1 / Child #24 - Remove demo stencil-js-utils bridge file (task slice: direct loader import + SSR-only hydrate import)

### Task completed

- Removed demo helper module `apps/qwik-demo/src/components/stencil-js-utils.ts`.
- Inlined Stencil bridge functions into `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`:
  - direct top-level import for `defineCustomElements` from `@qwik-custom-elements/test-stencil-lib/loader`
  - SSR-only dynamic import for `renderToString` from `@qwik-custom-elements/test-stencil-lib/hydrate`
- Kept adapter runtime bridge wiring stable by using `inlinedQrl(..., symbolName)` for both bridge QRLs.

### Key decisions

- Kept scope to one task slice under child `#24`: remove only the demo utils indirection while preserving existing runtime behavior.
- Did not add top-level `hydrate` import in demo component module because Stencil hydrate runtime depends on Node `stream`, which is not browser-compatible in Vite client graph.
- Kept the non-SSR early return in the inlined `renderToString(...)` helper as a defensive guard, even though `createStencilSSRComponent` invokes it only in server branch.

### Key findings

- Top-level import of `@qwik-custom-elements/test-stencil-lib/hydrate` in a client-reachable module reproduces Vite browser error: `Module "stream" has been externalized for browser compatibility`.
- Direct top-level import of `@qwik-custom-elements/test-stencil-lib/loader` is safe for client bootstrap path.
- SSR-only dynamic import for hydrate preserves direct package consumption without reintroducing copied runtime pathing.

### Validation loops run

- `npm run format` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run build` (passed)
- `npm run lint` (passed)
- `npm run e2e` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`
- `apps/qwik-demo/src/components/stencil-js-utils.ts` (deleted)

### Blockers / notes for next iteration

- No blocker for this slice.
- If desired later, consider exposing an adapter-owned server-only helper for stencil hydrate resolution to avoid repeating this SSR-only dynamic-import pattern in consumers.

## 2026-04-08 - PRD #1 / Child #24 - Stencil-events SSR optimizer regression fix (task slice: adapter SSR consumption path)

### Task completed

- Fixed boundary QRL wiring in demo adapter bridge wrapper:
  - `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`
  - replaced module-scope wrappers with `inlinedQrl(..., symbolName)` for `renderToString` and `defineCustomElements`.
- Added demo Vite alias so `@qwik-custom-elements/adapter-stencil/ssr` resolves to adapter source entry during demo dev/build:
  - `apps/qwik-demo/vite.config.ts`.
  - this ensures Qwik optimizer transforms adapter SSR `component$/$` usage for demo runtime evaluation.

### Key decisions

- Kept scope in child `#24` because regression is directly tied to runtime bridge extraction and demo consumption cutover.
- Avoided broader adapter packaging refactor in this slice; used a demo-side alias for immediate runtime correctness and deterministic validation.
- Kept existing route-level behavior and event-handler logic unchanged; only fixed SSR/runtime wiring paths.

### Key findings

- Initial `inlinedQrl` patch alone was insufficient: runtime error still occurred from `packages/adapter-stencil/dist/ssr/stencil-ssr.js` because plain `tsc` output is consumed unoptimized in demo dev SSR path.
- `inlinedQrl` in this Qwik version requires explicit `symbolName`; missing second argument produced TypeScript error and optimizer panic.
- Using `inlinedQrl` for the adapter `useOnDocument('load', ...)` callback produced a browser dynamic-import fetch failure in dev (`...client-setup.ts_stencilClientSetupLoad.js`), so that callback was reverted to optimizer-managed `$()` while keeping the source alias path.
- With source aliasing + callback rollback, startup SSR evaluation and route load no longer emitted the original `$()` optimizer runtime error.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/adapter-stencil run build` (initial RED -> GREEN after `inlinedQrl` symbol-name fix)
- `pnpm --filter qwik-demo run build` (initial RED -> GREEN after `inlinedQrl` symbol-name fix)
- `pnpm --filter qwik-demo run dev --host 127.0.0.1 --port 5173` (startup no longer throws stencil-events optimizer error)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run build` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`
- `apps/qwik-demo/vite.config.ts`

### Blockers / notes for next iteration

- Follow-up improvement candidate: make adapter-stencil published SSR output optimizer-safe without requiring consumer-side aliasing (separate packaging/build task).

## 2026-04-08 - PRD #1 / Child #24 - Demo runtime direct package consumption (task slice: remove copied stencil-runtime pathing and restore build)

### Task completed

- Replaced demo Stencil runtime loading in `apps/qwik-demo/src/components/stencil-js-utils.ts` to use direct package exports from `@qwik-custom-elements/test-stencil-lib`:
  - `@qwik-custom-elements/test-stencil-lib/loader`
  - `@qwik-custom-elements/test-stencil-lib/hydrate`
- Removed copied-artifact Vite plumbing in `apps/qwik-demo/vite.config.ts` that was specific to `/public/stencil-runtime` + `@fs` runtime URL defines.
- Moved `@qwik-custom-elements/adapter-stencil` to `devDependencies` in `apps/qwik-demo/package.json` to satisfy Qwik duplicate-dependency guard behavior.
- Added `@qwik-custom-elements/test-stencil-lib` as a workspace `devDependency` for deterministic direct package import resolution in demo build flow.

### Key decisions

- Kept scope inside child `#24` because this gap was part of adapter-runtime ownership cutover completion, not a separate feature.
- Kept the Vite duplicate dependency safety guard intact; fixed dependency bucket placement instead of relaxing policy.
- Used SSR-only dynamic import with `@vite-ignore` for hydrate module to prevent client build from bundling Node-only `stream` dependency.

### Key findings

- Initial direct hydrate import attempt caused client build failure because `hydrate/index.mjs` depends on Node `stream`; static-analyzable import path was pulled into client graph.
- Constraining hydrate module loading to SSR runtime path resolved the build while preserving direct package consumption semantics.

### Validation loops run

- `pnpm --filter qwik-demo run build` (RED -> GREEN during fix)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run build` (passed)
- `npm run format` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `apps/qwik-demo/package.json`
- `apps/qwik-demo/src/components/stencil-js-utils.ts`
- `apps/qwik-demo/vite.config.ts`
- `pnpm-lock.yaml`

### Blockers / notes for next iteration

- No blocker for this slice.
- Child `#24` checklist/closure sync should now reflect direct package runtime consumption and successful demo build verification.

## 2026-04-08 - PRD #1 / Child #24 - Stencil runtime bridge ownership cutover (task slice: repository test coverage for adapter-stencil SSR bridge)

### Task completed

- Replaced `@qwik-custom-elements/adapter-stencil` test noop script with real test execution (`vitest run`).
- Added adapter-level regression tests covering the new runtime bridge ownership surface introduced for child #24:
  - metadata/probe contract validation (`src/index.test.ts`)
  - runtime prop-sync behavior (`src/ssr/element-props-utils.test.ts`)
  - SSR style-store behavior and deterministic keying (`src/ssr/styles-core.test.ts`)
- Updated child issue `#24` acceptance criteria to explicitly require repository regression tests for the new adapter-stencil runtime bridge functionality.

### Key decisions

- Kept this iteration strictly scoped to test coverage hardening for already-migrated adapter-stencil bridge behavior (no runtime logic changes).
- Focused tests on public/observable adapter contracts and deterministic utility behavior, avoiding fragile internal implementation assertions.
- Treated issue-state sync as body update only (no issue comments), per current workflow direction.

### Key findings

- Adapter-stencil test coverage gap was real: prior package script was still a noop despite new runtime bridge ownership work landing.
- A single failing styles-core assertion during RED phase exposed brittle length-coupled fallback-key expectations; stabilized with deterministic pattern assertions.

### Validation loops run

- `pnpm install` (passed)
- `pnpm --filter @qwik-custom-elements/adapter-stencil run test` (RED -> GREEN)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `packages/adapter-stencil/package.json`
- `packages/adapter-stencil/src/index.test.ts`
- `packages/adapter-stencil/src/ssr/element-props-utils.test.ts`
- `packages/adapter-stencil/src/ssr/styles-core.test.ts`
- `pnpm-lock.yaml`

### Blockers / notes for next iteration

- No blocker for this slice.
- Remaining #24 closeout can proceed once desired issue-state workflow (comment/close timing) is confirmed.

## 2026-04-08 - PRD #1 / Child #24 - Stencil runtime bridge ownership cutover (task slice: adapter-stencil SSR subpath export + demo import switch)

### Task completed

- Moved Stencil runtime bridge API ownership into `@qwik-custom-elements/adapter-stencil` by adding a new canonical `./ssr` export surface.
- Added adapter-owned SSR bridge module sources under `packages/adapter-stencil/src/ssr/*` and exposed them through package exports.
- Switched demo runtime bridge consumption from app-local `stencil-js-qwik-ssr` imports to adapter-owned imports (`@qwik-custom-elements/adapter-stencil/ssr`).
- Updated adapter metadata to declare `ssrRuntimeSubpath: './ssr'` and aligned summary-test expectations to the new contract.

### Key decisions

- Kept this iteration to one tracer-bullet ownership slice only: export/consumption cutover without changing core generation control flow.
- Preserved existing SSR probe/fallback behavior in core and only adjusted expected structured capability output where adapter metadata now intentionally differs.
- Added explicit app dependency on `@qwik-custom-elements/adapter-stencil` (`workspace:*`) so demo imports remain deterministic in workspace resolution.

### Key findings

- `adapter-stencil` needed Qwik-compatible TS compiler settings for TSX runtime bridge files; NodeNext extension rules were too strict for copied bridge module imports.
- Existing core fallback semantics remained intact; the only deterministic contract update was stencil `ssrRuntimeSubpath` becoming `./ssr`.

### Validation loops run

- `pnpm install` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)
- `npm run test` (post-format scope cleanup pass)
- `npm run typecheck` (final pass)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `apps/qwik-demo/package.json`
- `apps/qwik-demo/src/components/stencil-js-utils.ts`
- `apps/qwik-demo/src/components/stencil-lib-ssr.tsx`
- `packages/adapter-stencil/package.json`
- `packages/adapter-stencil/tsconfig.json`
- `packages/adapter-stencil/src/index.ts`
- `packages/adapter-stencil/src/ssr/index.ts`
- `packages/adapter-stencil/src/ssr/client-setup.ts`
- `packages/adapter-stencil/src/ssr/element-props-utils.ts`
- `packages/adapter-stencil/src/ssr/model.ts`
- `packages/adapter-stencil/src/ssr/styles-core.ts`
- `packages/adapter-stencil/src/ssr/stencil-ssr.tsx`
- `packages/core/src/__tests__/config.test.ts`
- `pnpm-lock.yaml`

### Blockers / notes for next iteration

- Child #24 acceptance criteria appear satisfied for this slice.
- Follow-up cleanup can remove now-redundant app-local bridge source files in `apps/qwik-demo/src/components/stencil-js-qwik-ssr` once no remaining internal consumers require them.

## 2026-04-07 - PRD #1 priority update (Stencil-first sequencing; Lit work blocked)

### Task completed

- Updated child issue `#13` (Lit SSR tracer bullet) to add an explicit blocker on `#24` (Stencil runtime bridge extraction).
- Enforced requested sequencing policy: continue Stencil adapter integration work before any further Lit adapter implementation slices.

### Key decisions

- Lit adapter issue execution is now gated by open Stencil integration issue `#24`.
- Existing blockers (`#22`, `#23`) remain in place; this change adds a Stencil-first ordering constraint.

### Key findings

- Issue `#13` and issue `#24` were both open and previously shared the same blocker set, so explicit ordering between them was not encoded until now.

### Validation loops run

- `gh issue view 13 --json number,title,body,state,url`
- `gh issue view 24 --json number,title,body,state,url`
- `gh issue edit 13 --body-file <temp-file>`
- `gh issue view 13 --json number,body` (verification)

### Files changed

- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Next implementation should target issue `#24` (Stencil runtime bridge ownership) before resuming issue `#13` Lit SSR work.

## 2026-04-07 - PRD #1 / Child #13 - Lit SSR happy-path POC (task slice: core consumption of generic adapter SSR hook)

### Task completed

- Updated core generation to consume adapter-generic SSR render hook `renderComponentSsrHtml(...)` when SSR probe is available.
- Wrapper generation now emits an additional deterministic SSR HTML export (`<WrapperName>SsrHtml`) only when adapter hook returns string markup.
- Extended existing lit SSR subpath generator test to assert wrapper-level SSR HTML export output.
- Removed now-unnecessary compatibility alias export from lit adapter source:
  - removed `renderLitSsrComponent` alias after core switched to generic hook.

### Key decisions

- Kept this slice intentionally narrow: no real Lit SSR runtime implementation was added.
- Preserved placeholder semantics in adapter hook and kept framework-specific implementation details inside adapter package.

### Key findings

- No repository references remained for `renderLitSsrComponent` once core consumption switched to the generic hook name.
- Existing SSR probe + fallback flow in core required only a small planned-write enrichment to demonstrate contract consumption.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- generator.test.ts` (passed)
- `pnpm --filter @qwik-custom-elements/adapter-lit run check-types` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `packages/adapter-lit/src/ssr.ts`

### Blockers / notes for next iteration

- Child #13 remains open for true end-to-end Lit SSR happy-path verification and explicit POC boundary documentation.

## 2026-04-07 - PRD #1 / Child #13 - Lit SSR happy-path POC (task slice: placeholder generic adapter SSR hook alignment)

### Task completed

- Added a minimal, adapter-owned generic SSR hook in `@qwik-custom-elements/adapter-lit`:
  - `renderComponentSsrHtml(options)`
- Added concise placeholder comments clarifying that current output is tracer-bullet scaffolding, not true Lit SSR.
- Removed the previous implicit fallback to `lit-button` for missing/invalid `tagName`; placeholder now returns `null` instead.
- Kept temporary compatibility alias export:
  - `renderLitSsrComponent = renderComponentSsrHtml`

### Key decisions

- Kept this slice adapter-only and intentionally small; no core generation behavior changes were introduced.
- Used explicit TODO comments tied to child issue `#13` to make placeholder scope and follow-up intent obvious in code.

### Key findings

- Adapter-side placeholder behavior can remain useful for contract wiring while still avoiding framework-specific fallback defaults that may mask invalid inputs.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/adapter-lit run check-types` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `packages/adapter-lit/src/ssr.ts`

### Blockers / notes for next iteration

- Child #13 remains open for true end-to-end Lit SSR happy-path verification and explicit POC boundary documentation.

## 2026-04-07 - Adapter packages TypeScript migration (task slice: dist-only adapter outputs + core local-loader compatibility)

### Task completed

- Migrated `@qwik-custom-elements/adapter-stencil` from root JS entrypoint to a TypeScript package layout with `src/` sources, `tsconfig.json`, and compiled `dist/` output.
- Migrated `@qwik-custom-elements/adapter-lit` (including canonical `./ssr` subpath) to TypeScript with declaration output and `dist/`-based exports.
- Switched both adapter package manifests to real TypeScript scripts (`build`, `check-types`, `dev`) and narrowed publish surface to `dist`.
- Removed legacy root runtime entrypoints (`index.js`/`ssr.js`) from both adapters as part of the dist-only package contract.
- Updated core workspace-local adapter fallback resolution so `adapterPackage` values resolve to `dist/index.js` and `dist/<subpath>.js` for scoped local packages.
- Updated core adapter-version summary resolution so scoped subpath specifiers (for example `@qwik-custom-elements/adapter-lit/ssr`) resolve package version from the adapter package root.
- Updated core test workflow to build both adapter packages before running vitest so dist-only fallback imports remain deterministic in local monorepo runs.

### Key decisions

- Kept the migration aligned with core package conventions: NodeNext ESM, declaration output, `src` -> `dist`, and explicit exports map entries.
- Chose true dist-only adapter packaging (no root compatibility shims) and moved compatibility handling into core local fallback resolution.
- Preserved canonical lit SSR subpath contract (`@qwik-custom-elements/adapter-lit/ssr`) while changing its resolved local fallback target to dist output.

### Key findings

- Core generation already uses `projects[].adapterPackage` as the loading source of truth; only workspace fallback path assumptions required adjustment for dist-only adapters.
- Without adapter prebuild in the core test loop, local fallback imports would fail because legacy root JS files no longer exist.
- Root Turbo feedback loops remained green after migration and compatibility updates.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/adapter-stencil run build` (passed)
- `pnpm --filter @qwik-custom-elements/adapter-lit run build` (passed)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `pnpm --filter @qwik-custom-elements/core run test` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `packages/adapter-stencil/package.json`
- `packages/adapter-stencil/tsconfig.json`
- `packages/adapter-stencil/src/index.ts`
- `packages/adapter-stencil/index.js` (deleted)
- `packages/adapter-lit/package.json`
- `packages/adapter-lit/tsconfig.json`
- `packages/adapter-lit/src/index.ts`
- `packages/adapter-lit/src/ssr.ts`
- `packages/adapter-lit/index.js` (deleted)
- `packages/adapter-lit/ssr.js` (deleted)
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/package.json`

### Blockers / notes for next iteration

- No blocker for this migration slice.
- Follow-up hardening could add an explicit regression test that exercises local fallback resolution against dist-only adapter paths without prior manual package import warmup.

## 2026-04-07 - PRD #1 / Child #23 - PACKAGE_NAME source resolution and deterministic CEM diagnostics (task slice: discovery + cemPath safety)

### Task completed

- Implemented `PACKAGE_NAME` source-mode path resolution in core generation with deterministic CEM discovery.
- Added explicit `cemPath` override handling with strict safety guards:
  - reject absolute `cemPath`
  - reject `cemPath` traversal outside package root
- Added deterministic diagnostics for unresolved and ambiguous PACKAGE_NAME discovery with remediation guidance (`Set source.cemPath ...`).
- Updated built-in adapter capability metadata to declare PACKAGE_NAME support in:
  - `@qwik-custom-elements/adapter-stencil`
  - `@qwik-custom-elements/adapter-lit`
  - `@qwik-custom-elements/adapter-lit/ssr`
- Added integration-style generator regression coverage for:
  - successful PACKAGE_NAME discovery
  - no-candidate deterministic failure
  - ambiguous-candidate deterministic failure
  - absolute/outside-root `cemPath` safety failures

### Key decisions

- Kept this slice focused on core source-resolution behavior only; no unrelated SSR/runtime behavior changes.
- Used deterministic discovery candidates (`custom-elements.json`, `dist/custom-elements.json`) when `cemPath` is omitted.
- Preserved planning-time adapter/source compatibility checks and made PACKAGE_NAME usable by declaring support in built-in adapter metadata.

### Key findings

- Prior state accepted PACKAGE_NAME shape in config but hard-failed generation with `QCE_SOURCE_MODE_UNSUPPORTED`.
- A red-first generator test extension provided direct public-boundary verification with minimal churn.
- Root Turbo feedback loops remain green after this slice.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- generator.test.ts` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)
- `npm run test` (post-format pass)

### Files changed

- `.prd/progress/progress-for-prd-1.md`
- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `packages/adapter-stencil/index.js`
- `packages/adapter-lit/index.js`
- `packages/adapter-lit/ssr.js`

### Blockers / notes for next iteration

- Child #23 acceptance criteria appear satisfied for deterministic PACKAGE_NAME discovery, override safety, and diagnostics.
- Next logical step is issue state sync for #23 (completion comment + close), then advancing to child #24.

## 2026-04-07 - PRD #1 / Child #22 - Structured SSR project output baseline (task slice: project-level structured SSR capability fields)

### Task completed

- Added structured SSR capability fields to core project generation output (`ssrCapabilities`) with deterministic shape.
- Added structured SSR capability fields to run summary project entries so machine consumers can assert SSR behavior without parsing warning text.
- Preserved deterministic SSR fallback diagnostics (`QCE_SSR_UNSUPPORTED_FALLBACK`) while enriching output structure.
- Added/updated integration-style regression assertions for generator and CLI summary outputs across success, fallback, failed, and skipped project scenarios.

### Key decisions

- Kept this slice narrowly scoped to structured SSR capability output only; no PACKAGE_NAME source resolution behavior was added.
- Used one canonical structured shape for both generation results and run-summary project entries:
  - `available`
  - `supportsSsrProbe`
  - `ssrRuntimeSubpath`
- For synthetic failed/skipped summary entries (where adapter probe does not run), emitted deterministic default SSR capability values.

### Key findings

- Existing #22 fallback diagnostics and SSR probing paths were sufficient; the main gap was result/summary contract shape, not probe logic.
- A red-first extension of existing SSR integration tests provided direct public-boundary verification with minimal churn.
- Root Turbo loops remain green with this slice.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- generator.test.ts` (RED expected failure first)
- `pnpm --filter @qwik-custom-elements/core run test -- generator.test.ts config.test.ts` (GREEN pass)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #22 acceptance criteria now appear satisfied across completed slices.
- Next logical iteration is issue state sync for #22 (completion comment + close) and then advancing to child #23.

## 2026-04-07 - PRD #1 / Child #22 - Adapter/source planning-time compatibility baseline (task slice: adapter capability metadata source-type checks)

### Task completed

- Added planning-time adapter/source compatibility validation in core generation using adapter capability metadata.
- Enforced deterministic failure (`QCE_ADAPTER_SOURCE_INCOMPATIBLE`) when a project's `source.type` is not declared as supported by the selected adapter package.
- Added/updated adapter capability metadata exports (`supportedSourceTypes`) in stencil and lit adapter entrypoints (including the lit `./ssr` subpath).
- Added a regression test proving unsupported adapter/source combinations fail deterministically before generation succeeds.

### Key decisions

- Kept this slice narrowly scoped to planning-time source compatibility checks only (no PACKAGE_NAME generation support added here).
- Used `metadata.supportedSourceTypes` as the machine-readable capability field for source-mode support checks.
- Preserved backward compatibility behavior by defaulting missing adapter metadata to CEM support for existing adapters.

### Key findings

- Existing generation flow loaded adapters for SSR probing but had no contract check tying adapter capabilities to project source type.
- A single integration-style generator test was sufficient to prove the red-to-green behavior at the public generation boundary.
- Root Turbo loops remain green with this slice.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- generator.test.ts` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `packages/adapter-stencil/index.js`
- `packages/adapter-lit/index.js`
- `packages/adapter-lit/ssr.js`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #22 remains open.
- Next smallest #22 slice is adding structured project-level SSR capability fields to generation output in addition to deterministic diagnostics.

## 2026-04-07 - PRD #1 / Child #22 - Source contract V2 correction (task slice: remove legacy string source contract)

### Task completed

- Aligned core project source contract with PRD by removing legacy string source support.
- Enforced object-only discriminated `source` in core types and config validation.
- Removed legacy string fallback branches from generator/CLI source-path resolution.
- Updated root config and core tests to use discriminated CEM source objects.
- Added a regression test asserting legacy string `source` is rejected.

### Key decisions

- Treated string `source` as a contract regression because PRD #1 requires discriminated object source modes only.
- Kept this slice narrowly focused on contract correctness (no new PACKAGE_NAME resolution behavior added here).
- Preserved deterministic error messaging for invalid source shape via `QCE_CONFIG_INVALID_TYPE`.

### Key findings

- The previous #22 baseline entry still documented temporary string backward compatibility, which conflicted with the canonical PRD issue text.
- Fixture/test updates were required across both config and generator suites because many project definitions still used string source paths.
- After correction, root Turbo loops remained green.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- config.test.ts generator.test.ts` (passed)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/config.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `qwik-custom-elements.config.json`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #22 remains open.
- Next smallest #22 slice remains planning-time adapter/source compatibility checks from adapter capability metadata.

## 2026-04-07 - PRD #1 / Child #22 - Source contract V2 baseline (task slice: discriminated source object CEM mode in config + generation path support)

### Task completed

- Added support for discriminated project source objects in core config validation, including `type: "CEM"` with required `path`.
- Added baseline source object typing in core types while keeping legacy string source compatibility for existing configs.
- Updated generation/CLI source-path resolution to consume CEM source objects and keep deterministic summary/source path behavior.
- Added a focused RED-to-GREEN config regression test that validates loading a CEM discriminated source object.

### Key decisions

- Kept this slice intentionally narrow to one tracer-bullet behavior: CEM-mode source object contract support.
- Included `PACKAGE_NAME` source shape validation in config for forward compatibility, but deferred generation support for that mode to follow-up issue slices.
- Preserved backward compatibility with string `source` to avoid broad config churn in one iteration.

### Key findings

- TDD RED failure was deterministic and actionable: `projects[0].source` accepted only string before this slice.
- Introducing source unions required a small CLI summary fallback update where source paths were previously resolved as string-only.
- Root Turbo feedback loops passed after the union-related typecheck fix (`npm run typecheck`, `npm run test`, `npm run format`).

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- config.test.ts` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/config.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #22 remains open.
- Next smallest slices under #22 are:
  - planning-time adapter/source compatibility checks using explicit adapter capability metadata,
  - project-level structured SSR capability output fields,
  - generation support for `PACKAGE_NAME` mode (tracked for sequencing with child #23).

## 2026-04-07 - PRD #1 refresh + tracer-bullet issue realignment

### Task completed

- Replaced parent PRD issue `#1` body with the approved full PRD rewrite from `.docs/qwik-custom-elements-prd.md`.
- Fixed a post-update typo in the issue body (`determministic` -> `deterministic`) and re-verified the published text.
- Created missing tracer-bullet issues for newly introduced PRD scope:
  - `#22` Tracer Bullet 15: Source contract V2 and adapter capability metadata baseline
  - `#23` Tracer Bullet 16: PACKAGE_NAME source resolution and CEM override diagnostics
  - `#24` Tracer Bullet 17: Extract Stencil runtime bridge to adapter-stencil
- Updated open issue `#13` to align with revised PRD wording and blocked it by `#22` and `#23`.

### Key decisions

- Kept parent PRD as a full canonical replacement (not an amendment append) per review direction.
- Preserved existing downstream open issues `#14` and `#15` as still relevant under the updated PRD.
- Chose clean dependency ordering for new work: contract baseline -> package-name resolution -> stencil runtime extraction.

### Key findings

- Existing open issues `#13/#14/#15` were still needed, but `#13` required blocker/body updates after PRD replacement.
- Historical duplicate closed issue sets (`#16-#21`) exist from earlier PRD cycles; current active chain remains `#13/#14/#15` plus newly created `#22/#23/#24`.
- Repository currently has no CI workflow files or CODEOWNERS yet, reinforcing that `#14/#15` remain substantive and unstarted.

### Validation loops run

- `gh issue edit 1 --body-file .docs/qwik-custom-elements-prd.md` (parent PRD update)
- `gh issue view 1 --json body` (verification)
- `gh issue create ...` for `#22`, `#23`, `#24` (creation links returned)
- `gh issue edit 13 --body ...` (blocker/body realignment)
- `gh issue view 13 --json body`
- `gh issue view 14 --json body`
- `gh issue view 15 --json body`

### Files changed

- `.docs/qwik-custom-elements-prd.md`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Next implementation work should start from `#22` (source contract baseline), then `#23`, then `#24`, before finishing remaining `#13` Lit SSR happy-path completion.

## 2026-04-06 - PRD #1 / Child #13 - Lit SSR happy-path POC (task slice: canonical adapter-lit/ssr subpath consumability in monorepo generation)

### Task completed

- Added a canonical Lit SSR subpath entrypoint at `@qwik-custom-elements/adapter-lit/ssr` with a minimal happy-path SSR probe contract.
- Extended core workspace-local adapter resolution so scoped adapter package subpaths resolve deterministically during monorepo runs.
- Added integration-style generator coverage proving `adapterPackage: "@qwik-custom-elements/adapter-lit/ssr"` loads successfully and does not emit fallback warning code.

### Key decisions

- Kept this iteration to one narrow tracer-bullet slice for child #13: subpath contract consumability only.
- Left broader Lit SSR rendering integration out of scope for this slice to avoid overreaching beyond one task.
- Preserved existing root `@qwik-custom-elements/adapter-lit` behavior while introducing the new canonical `./ssr` path.

### Key findings

- The new RED test failed with `QCE_ADAPTER_LOAD_FAILED` because workspace-local resolution treated `@qwik-custom-elements/adapter-lit/ssr` as package `ssr`.
- Supporting scoped adapter subpath resolution plus `adapter-lit/ssr.js` was sufficient to make the Lit SSR subpath contract loadable through core generation.
- Root Turbo feedback loops passed for this slice (`npm run typecheck`, `npm run test`, `npm run format`).

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test -- generator.test.ts` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `packages/adapter-lit/package.json`
- `packages/adapter-lit/ssr.js`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #13 remains open; this slice establishes the canonical adapter-lit SSR subpath contract but does not yet complete a demoable one-component Lit SSR render path.
- Next smallest slice can wire one concrete Lit SSR happy-path render assertion through an end-to-end surface (core generation output and/or demo route), while documenting explicit POC boundaries.

## 2026-04-06 - PRD #1 / Child #12 - Lit adapter vertical slice (task slice: adapter-lit entrypoint + deterministic CEM fallback warning regression)

### Task completed

- Added the first real `@qwik-custom-elements/adapter-lit` package entrypoint (`index.js`) so core can load the adapter package in monorepo runs.
- Implemented baseline Lit adapter SSR probe contract returning unavailable SSR (`probeSSR() -> { available: false }`) to exercise deterministic fallback-to-CEM behavior.
- Added core generator regression coverage proving Lit adapter package loading succeeds and unsupported-SSR warning emission is deterministic.

### Key decisions

- Kept this iteration to one narrow tracer-bullet slice for child #12: make adapter-lit loadable and verify fallback warning behavior, without broadening into Lit SSR implementation.
- Reused existing core fallback warning code contract (`QCE_SSR_UNSUPPORTED_FALLBACK`) to avoid introducing new warning semantics.
- Added an integration-style test through `generateFromConfig(...)` to validate behavior at the public generation boundary.

### Key findings

- The new test initially failed with deterministic adapter load diagnostics (`QCE_ADAPTER_LOAD_FAILED`) because `packages/adapter-lit/index.js` did not exist.
- Adding the adapter-lit entrypoint was sufficient to unblock package loading and make the fallback path observable for Lit.
- Root Turbo feedback loops are available and passed for this slice (`npm run typecheck`, `npm run test`, `npm run format`).

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/adapter-lit/index.js`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #12 acceptance criteria now appear satisfied by completed slices: Lit adapter contract integration for non-SSR path, deterministic fallback-to-CEM behavior, and testable warning emission.
- Next logical step is issue state sync: leave final completion comment and close child issue #12.

## 2026-04-06 - PRD #1 / Child #11 - Stencil adapter vertical slice (task slice: demo SSR parity route wired to generated wrapper tags)

### Task completed

- Wired the `stencil-events` demo route to consume core-generated wrapper tag constants from `apps/qwik-demo/src/generated` instead of hardcoded Stencil tag strings.
- Regenerated deterministic wrapper artifacts for the demo project via core CLI using the repository config (`qwik-custom-elements.config.json`).
- Preserved the prior unsupported-SSR fallback warning behavior while proving the SSR-available stencil adapter path can be exercised through the monorepo app route.

### Key decisions

- Kept this iteration to one narrow tracer-bullet slice for child #11: app-level SSR parity wiring only, with no broad SSR runtime refactor.
- Used generated wrapper constants (`QwikDeButton`, `QwikDeAlert`) as the integration seam so the route depends on the generation pipeline output directly.
- Left existing fallback-warning validation in core tests unchanged, since that acceptance criterion was already satisfied in the prior #11 slice.

### Key findings

- `apps/qwik-demo/src/routes/stencil-events/index.tsx` already exercised SSR rendering via `StencilJsLibSSRComponent`; replacing hardcoded tag strings with generated tags provided a minimal end-to-end parity proof path.
- Root Turbo feedback loops are available and passed for this slice (`npm run typecheck`, `npm run test`, `npm run format`).
- Running the core CLI writes `generated-run-summary.json` by default; it was removed after generation to keep this task commit scoped.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run build` (passed)
- `node packages/core/dist/cli.js` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `apps/qwik-demo/src/routes/stencil-events/index.tsx`
- `apps/qwik-demo/src/generated/index.ts`
- `apps/qwik-demo/src/generated/de-alert.ts`
- `apps/qwik-demo/src/generated/de-alert-shadow.ts`
- `apps/qwik-demo/src/generated/de-button.ts`
- `apps/qwik-demo/src/generated/de-button-shadow.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #11 acceptance criteria now appear satisfied across completed slices: adapter integration, unsupported-SSR fallback warning validation, and one demoable/verifiable SSR parity scenario in monorepo app flow.
- Next logical step is issue state sync: leave final completion comment and close child issue #11.

## 2026-04-06 - PRD #1 / Child #11 - Stencil adapter vertical slice (task slice: adapter SSR probe integration with deterministic CEM fallback warning)

### Task completed

- Added adapter SSR probing in core generation flow and integrated adapter package loading for project-configured `adapterPackage` values.
- Added deterministic fallback behavior for unsupported SSR probes: generation continues in CEM-only mode and records warning code `QCE_SSR_UNSUPPORTED_FALLBACK` at project-result level.
- Added a minimal adapter-stencil package entrypoint (`index.js`) exposing `probeSSR()` so stencil projects can participate in the generation contract.
- Added generator + CLI regression coverage for unsupported SSR fallback behavior and warning emission.

### Key decisions

- Kept this iteration to one narrow tracer-bullet slice for child #11: contract integration + fallback warning only (no SSR wrapper/rendering implementation yet).
- Treated unsupported SSR as non-fatal for this slice, preserving successful generation output while surfacing deterministic diagnostics.
- Added workspace-local adapter module resolution fallback for `@qwik-custom-elements/*` package names to keep local monorepo execution deterministic.

### Key findings

- Issue #11 is now the lowest-number open unblocked child under PRD #1 and active execution target.
- Existing generation result shape already supported per-project observed error codes, which made fallback warning modeling low-risk.
- Root Turbo feedback loops are now available and passed for this slice (`npm run typecheck`, `npm run test`, `npm run format`).

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (passed)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `packages/core/src/__tests__/config.test.ts`
- `packages/adapter-stencil/index.js`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #11 remains open. This slice does not yet prove an end-to-end SSR parity render scenario in demo/app flow.
- Next smallest slice can wire one concrete adapter-stencil SSR-available path with verifiable parity assertion while preserving fallback diagnostics.

## 2026-04-06 - PRD #1 / Child #10 - Run summary artifact contract (task slice: skipped-status outcomes for non-targeted projects)

### Task completed

- Added deterministic `skipped` project outcomes to generation results when CLI targeting excludes configured projects.
- Extended failed-run summary fallback to include skipped entries for non-targeted projects instead of marking every project as failed.
- Added CLI regression coverage asserting skipped project shape/details in emitted summary JSON.

### Key decisions

- Kept scope to one small tracer-bullet slice: represent non-targeted projects as `skipped` without broadening into per-project mixed parallel failure attribution.
- Preserved deterministic ordering by `projectId` for mixed success/skipped summary output.
- Kept skipped project artifacts minimal (`durationMs: 0`, empty error codes, deterministic generated index path) to match current summary contract.

### Key findings

- Issue #10 was the lowest-number open unblocked child under PRD #1 and remains the active execution target.
- Root Turbo scripts now exist and are stable for required feedback loops (`npm run typecheck`, `npm run test`, `npm run format`).
- Existing summary contract handled skipped status already at type level; the implementation gap was generation/CLI population.

### Validation loops run

- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- If needed for follow-up hardening, add mixed-result parallel tests that preserve per-project failure codes instead of relying on aggregate parallel failure code.

## 2026-04-06 - PRD #1 / Child #10 - Run summary artifact contract (task slice: failed-run per-project status representation)

### Task completed

- Extended failed-run summary emission so `projects[]` is populated with deterministic per-project failed entries instead of an empty list.
- Added per-project `observedErrorCodes` propagation into summary output and normalization for stable sorted/unique ordering.
- Updated CLI regression coverage to assert failed project status/details in summary JSON.

### Key decisions

- Kept this iteration to one smallest tracer-bullet slice for child #10: represent failed per-project summary entries on generation failure.
- Used selected project ids from CLI/config targeting as the deterministic project set for failure summary emission.
- Assigned the thrown generation error code to each failed project entry for this slice, leaving mixed per-project error differentiation as follow-up scope.

### Key findings

- Root repository scripts now execute through Turbo (`npm run typecheck`, `npm run test`, `npm run format`) and succeeded in this run.
- Existing summary writer path only needed shape enrichment; no schema version change was required.
- Workspace formatting command currently touches broader package files; task commits should remain intentionally scoped.

### Validation loops run

- `npm run typecheck` (passed)
- `npm run test` (passed)
- `npm run format` (passed)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #10 remains open; skipped-status modeling and mixed-result per-project failure attribution still need dedicated follow-up slices.

## 2026-04-06 - PRD #1 / Child #10 - Run summary artifact contract (task slice: baseline summary JSON emission on successful runs)

### Task completed

- Added baseline run summary artifact emission from core CLI to `generated-run-summary.json` by default (or `summaryPath` when configured).
- Extended generation result metadata to include per-project status, duration, and generated index path so summary payload can be built from deterministic runtime data.
- Added focused CLI regression coverage validating summary file creation and required baseline fields.

### Key decisions

- Kept this iteration to one smallest tracer-bullet slice for child #10: successful-run summary emission only.
- Scoped summary status to currently supported outcome (`success`) for this slice and left failed/skipped project status expansion for follow-up slices.
- Used schema version `1.0.0` for initial summary contract and deterministic sorted unique run-level error code aggregation (currently empty for successful runs).

### Key findings

- `summaryPath` was already available in config parsing, so the main implementation gap was CLI summary writing and result-shape metadata.
- Existing deterministic project sorting in generation flow naturally carries into deterministic summary project ordering.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace/package equivalents are required.
- Workspace typecheck loop currently fails in `packages/test-stencil-lib` because `tsc` is not available in that package execution environment (`'tsc' is not recognized as an internal or external command`).

### Validation loops run

- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `pnpm --filter @qwik-custom-elements/core run test` (passed)
- `pnpm turbo run check-types` (failed in `@qwik-custom-elements/test-stencil-lib` due to missing `tsc` command in package env)
- `pnpm -r --if-present run test` (passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/index.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #10 remains open; this slice did not yet implement failure/skipped project status representation or non-empty observed error code aggregation in summary JSON.
- Next logical slice is extending summary emission to include deterministic failure outcomes and observed error codes for mixed-result runs.

## 2026-04-05 - PRD #1 / Child #2 - Baseline workspace manifests

### Task completed

- Added minimal `package.json` manifests for all initial workspace shells required by child issue #2:
  - `apps/qwik-demo`
  - `packages/core`
  - `packages/adapter-stencil`
  - `packages/adapter-lit`
  - `packages/test-stencil-lib`
  - `packages/test-lit-lib`

### Key decisions

- Kept scope to a single smallest scaffold slice: package recognition + baseline task scripts only.
- Used lightweight no-op scripts (`build`, `check-types`, `dev`) to satisfy Turbo task graph wiring without introducing implementation details.
- Marked fixture libraries and demo app as private; kept publishable package names scoped under `@qwik-custom-elements`.

### Key findings

- `pnpm-workspace.yaml` and `turbo.json` were already correctly configured for `apps/*` and `packages/*`.
- Failure risk was missing package manifests, not workspace config.
- `pnpm turbo run check-types` and `pnpm turbo run build` now execute across all six projects without missing-package errors.
- `pnpm turbo run dev --dry` confirms all six projects are recognized for `dev` without launching persistent processes.

### Validation loops run

- `pnpm install`
- `pnpm turbo run check-types`
- `pnpm turbo run build`
- `pnpm -r run test --if-present`
- `pnpm turbo run dev --dry`

### Files changed

- `apps/qwik-demo/package.json`
- `packages/core/package.json`
- `packages/adapter-stencil/package.json`
- `packages/adapter-lit/package.json`
- `packages/test-stencil-lib/package.json`
- `packages/test-lit-lib/package.json`
- `pnpm-lock.yaml`

### Blockers / notes for next iteration

- No blocker for child issue #2 acceptance criteria after this task.
- Next logical iteration can replace no-op scripts with real build/typecheck/dev commands as implementation starts.

## 2026-04-05 - PRD #1 / Child #3 - Interface contract design for core and adapters

### Task completed

- Documented three distinct interface shapes for core and adapter contracts:
  - Minimal single-entry core API
  - Capability-driven plugin model
  - Common-case-first plan+generate model
- Selected a final contract that combines common-case ergonomics with explicit planning boundaries.
- Captured SSR probing/fallback behavior and metadata integration touchpoints in a dedicated design artifact.

### Key decisions

- Chosen contract keeps core ownership of generation orchestration and config/plan validation.
- Adapter contract remains runtime + metadata only, with no adapter generator API.
- SSR capability is probed per project; unsupported SSR triggers deterministic fallback-to-CEM warning behavior.
- Final interface exposes `plan` and `generate` as stable boundaries for deterministic CI and future parallel execution.

### Key findings

- Locked migration decisions in `.docs/qwik-custom-elements-decisions.md` already constrain architecture strongly enough to select a contract without implementation churn.
- Option C (plan + generate) best balances immediate tracer-bullet implementation needs and long-term extensibility.
- No code scaffolding changes were required in package folders for this issue; design artifact is sufficient for acceptance criteria.

### Validation loops run

- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (closest equivalent; passed)
- `pnpm -r run test --if-present` (closest equivalent in workspace)

### Files changed

- `.docs/core-adapter-interface-design.md`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- No blocker for child issue #3 acceptance criteria after this task.
- Next logical iteration is child issue #4 (core CLI bootstrap with strict config validation), using the selected contract as input.

## 2026-04-05 - PRD #1 / Child #4 - Core CLI bootstrap with strict config validation

### Task completed

- Implemented the first runnable core CLI path in `packages/core` with argument parsing, deterministic error handling, and compiled executable output.
- Added strict config loading/validation for default JSON config and optional JS config variant.
- Added focused tests for config-path resolution, fail-fast validation behavior, and CLI argument parsing diagnostics.

### Key decisions

- Kept validation manual and explicit (no schema dependency) to preserve a small tracer-bullet slice and deterministic diagnostics.
- Enforced strict unknown-field rejection at both root config level and per-project level.
- Kept CLI behavior intentionally narrow for this issue: parse args, load+validate config, print deterministic success/failure output.

### Key findings

- Parent PRD child dependency parsing selected issue `#4` as the lowest-number open unblocked child.
- `npm run typecheck` and `npm run test` are still missing at repo root; workspace equivalents remain required.
- `pnpm -r run test --if-present` can pass `--if-present` to underlying test scripts if placed after `run`; the correct command shape is `pnpm -r --if-present run test`.
- Compiled CLI entrypoint executes from repository root (`node packages/core/dist/cli.js --help`) with expected usage output.

### Validation loops run

- `pnpm install`
- `pnpm --filter @qwik-custom-elements/core run check-types`
- `pnpm --filter @qwik-custom-elements/core run test`
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (closest equivalent; passed)
- `pnpm -r run test --if-present` (command shape mismatch; forwarded flag to vitest)
- `pnpm -r --if-present run test` (correct equivalent; passed)
- `pnpm --filter @qwik-custom-elements/core run build`
- `node packages/core/dist/cli.js --help`

### Files changed

- `.gitignore`
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/types.ts`
- `packages/core/src/config.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/index.ts`
- `packages/core/src/__tests__/config.test.ts`
- `pnpm-lock.yaml`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- No blocker for child issue #4 acceptance criteria after this task.
- Next logical iteration is child issue #5 (single-project CEM generation engine) building on this CLI/config foundation.

## 2026-04-05 - PRD #1 / Child #5 - Core single-project CEM generation engine (task slice: deterministic dry-run planning + single-file emit)

### Task completed

- Implemented a first end-to-end single-project CEM generation slice in `packages/core`:
  - Parses CEM source and extracts deduplicated component tags.
  - Produces deterministic planned writes (sorted tags, stable file content).
  - Supports dry-run mode that reports writes without mutating the filesystem.
  - Writes a generated `index.ts` file for non-dry-run execution.
- Wired CLI to invoke generation after config validation and report deterministic run output.
- Added focused tests for dry-run non-mutation behavior, deterministic output content, write mode emission, and deterministic read-failure error coding.

### Key decisions

- Kept scope to one smallest tracer-bullet task for child #5: single-project generation path with one generated output file (`index.ts`).
- Deferred broader wrapper-shape generation, per-component file fan-out, and deeper adapter integration to follow-up tasks.
- Enforced strict current slice guardrail: generator rejects multi-project configs for now with explicit unsupported error code.

### Key findings

- Root `npm run typecheck` and `npm run test` remain unavailable; package/workspace pnpm equivalents are required for feedback loops.
- Existing core test patterns (`withTempDir`) were sufficient to validate both dry-run and write-mode behavior with deterministic assertions.
- Stable provenance headers without timestamps are now present in generated content for this slice.

### Validation loops run

- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter @qwik-custom-elements/core run check-types` (closest equivalent; passed)
- `pnpm --filter @qwik-custom-elements/core run test` (closest equivalent; passed)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/index.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #5 is not fully complete yet; this iteration implemented one foundational task only.
- Next logical tasks in child #5 are:
  - expand generated output beyond a single tag index into wrapper artifacts,
  - tighten CEM schema/shape diagnostics,
  - evaluate safe transition from single-project-only guardrail to broader planning path.

## 2026-04-05 - PRD #1 / Child #5 - Core single-project CEM generation engine (task slice: deterministic wrapper artifact emission)

### Task completed

- Expanded single-project generation output from index-only planning to wrapper artifacts per component tag.
- Generator now plans and emits:
  - `index.ts` with deterministic tag list plus stable re-exports for generated wrappers.
  - one wrapper file per normalized component tag (`<tag>.ts`) with stable provenance header and deterministic symbol naming.
- Preserved dry-run contract: planned writes are fully reported while no files are written to disk.
- Added/updated tests to validate deterministic multi-file plans, dry-run non-mutation for all planned files, and non-dry-run file emission for both index and wrapper outputs.

### Key decisions

- Kept wrapper artifact shape intentionally minimal for this slice (const exports) to focus on acceptance criteria around end-to-end generation, determinism, and dry-run behavior.
- Kept existing single-project guardrail unchanged to avoid broadening into multi-project execution scope in child #5.

### Key findings

- TDD loop caught the exact gap immediately: prior implementation only generated one planned file, while issue intent required wrapper artifacts.
- Deterministic wrapper naming (`Qwik` + PascalCase tag) gives a stable scaffold for later adapter/runtime integration without introducing adapter coupling yet.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #5 is still open; remaining high-value scope is stronger CEM shape diagnostics and possibly broadening wrapper output details.

## 2026-04-05 - PRD #1 / Child #5 - Core single-project CEM generation engine (task slice: deterministic malformed CEM diagnostics)

### Task completed

- Added deterministic CEM shape validation for the generation input contract.
- Generator now fails fast with `QCE_CEM_INVALID_SHAPE` when the manifest does not include a required `modules` array.
- Added focused test coverage for malformed CEM shape diagnostics.

### Key decisions

- Kept this slice intentionally narrow to one concrete invalid-shape contract (`modules` must be an array) instead of introducing broad schema validation in one step.
- Preserved existing behavior for valid manifests and all previous deterministic dry-run/write semantics.

### Key findings

- Prior behavior silently accepted malformed CEM files and generated an empty wrapper index, which hides input issues.
- A deterministic validation error improves fail-fast behavior and keeps diagnostics CI-friendly.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #5 remains open; next smallest diagnostics step is validating component declaration shape beyond the top-level `modules` guard.

## 2026-04-05 - PRD #1 / Child #5 - Core single-project CEM generation engine (task slice: component declaration-level CEM diagnostics)

### Task completed

- Added declaration-level CEM shape diagnostics to fail fast on malformed module/declaration structures.
- Generator now rejects:
  - `modules[i].declarations` when provided but not an array.
  - `modules[i].declarations[j].tagName` when provided but not a non-empty string.
- Added focused tests for both declaration-level malformed input scenarios with deterministic error messages.

### Key decisions

- Kept this slice narrow to two concrete declaration-level guards instead of broad schema validation in one pass.
- Preserved permissive behavior for declarations that omit `tagName` entirely, so only explicitly malformed `tagName` values fail this slice.

### Key findings

- Without these guards, malformed declaration content silently degraded into empty generated outputs, masking source metadata problems.
- Index-based diagnostics (`modules[i]`, `declarations[j]`) provide stable and actionable CI/debug output.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #5 remains open; a natural next slice is deciding whether empty component extraction (no tags after validation) should hard-fail with a dedicated code.

## 2026-04-05 - PRD #1 / Child #6 - Demo app wiring (task slice: generated wrapper consumption path)

### Task completed

- Added the first verifiable demo-wiring path where the demo app consumes generated wrappers from `src/generated`.
- Added a root generation config and a small CEM fixture source so wrapper generation can target the demo app deterministically.
- Generated and committed demo wrapper artifacts (`index.ts` + per-tag wrapper files) from core CLI output.

### Key decisions

- Kept this as the smallest tracer-bullet task for child #6: prove wiring, not full app/runtime integration.
- Used TypeScript typecheck in `apps/qwik-demo` as the verification surface for importability of generated wrappers.
- Introduced a minimal demo-facing module (`demo-wiring.ts`) that imports generated exports and exposes a stable snapshot function.

### Key findings

- Demo app previously had only no-op scripts and no source tree, so a minimal TS scaffold was required to make wiring verifiable.
- Existing core generation output shape (`index.ts` re-exports + per-tag wrappers) is sufficient for direct demo imports.
- Root `npm run typecheck` and `npm run test` remain unavailable; pnpm workspace equivalents are still required.

### Validation loops run

- `pnpm install`
- `pnpm --filter @qwik-custom-elements/core run build`
- `node packages/core/dist/cli.js`
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter qwik-demo run check-types` (passed)
- `pnpm turbo run check-types` (passed)
- `pnpm -r --if-present run test` (passed)

### Files changed

- `apps/qwik-demo/package.json`
- `apps/qwik-demo/tsconfig.json`
- `apps/qwik-demo/src/demo-wiring.ts`
- `apps/qwik-demo/src/generated/index.ts`
- `apps/qwik-demo/src/generated/app-root.ts`
- `apps/qwik-demo/src/generated/card-panel.ts`
- `packages/test-stencil-lib/custom-elements.json`
- `qwik-custom-elements.config.json`
- `pnpm-lock.yaml`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #6 remains open; this slice only proves generated-wrapper consumption wiring.
- Next logical child #6 slices are deterministic re-run/no-diff verification and documenting/manual extension boundary in demo context.

## 2026-04-05 - PRD #1 / Child #6 - Demo app integration (task slice: deterministic re-run/no-diff proof)

### Task completed

- Added deterministic re-run coverage for generated wrapper artifacts in core generator tests.
- New test executes non-dry-run generation twice for the same input and verifies byte-stable outputs for:
  - planned write path ordering
  - planned write content
  - generated files on disk (`index.ts`, `app-root.ts`, `card-panel.ts`)

### Key decisions

- Kept this as a single narrow tracer-bullet task focused only on commit-stability proof.
- Used integration-style testing through the public `generateFromConfig(...)` API rather than implementation-level helpers.
- Did not expand runtime wrapper shape or adapter behavior in this slice to preserve issue #6 scope discipline.

### Key findings

- Existing generator behavior was already deterministic; this slice adds explicit regression protection for repeat-run stability.
- Root `npm run typecheck` and `npm run test` remain unavailable and continue to require pnpm workspace equivalents.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (passed)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter qwik-demo run check-types` (passed)
- `pnpm turbo run check-types` (passed)
- `pnpm -r --if-present run test` (passed)

### Files changed

- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #6 remains open; manual extension boundary documentation/example in demo context is still pending.

## 2026-04-05 - PRD #1 / Child #6 - Demo app integration (task slice: manual extension boundary documentation/example)

### Task completed

- Added an explicit manual extension layer under `apps/qwik-demo/src/manual` that composes generated wrappers without editing generated files.
- Updated demo wiring to consume the manual extension layer.
- Added demo-level documentation clarifying generated-vs-manual responsibilities and regeneration workflow.

### Key decisions

- Kept this as a documentation + wiring slice only, without expanding runtime wrapper behavior.
- Used `src/manual` as the canonical manual extension boundary sibling to generated output in `src/generated`.
- Demonstrated the pattern in code (`manual/custom-wrappers.ts`) and in docs (`apps/qwik-demo/README.md`).

### Key findings

- Existing generated file headers already warned against direct edits; this slice adds concrete demo usage and location guidance.
- PowerShell-safe multiline issue-comment pattern should be used to avoid literal `\n` output in GitHub comments.

### Validation loops run

- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter qwik-demo run check-types` (passed)
- `pnpm turbo run check-types` (passed)
- `pnpm -r --if-present run test` (passed)

### Files changed

- `apps/qwik-demo/src/demo-wiring.ts`
- `apps/qwik-demo/src/manual/custom-wrappers.ts`
- `apps/qwik-demo/src/manual/index.ts`
- `apps/qwik-demo/README.md`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #6 acceptance criteria are now satisfied by completed slices (demo wiring path, deterministic re-run stability proof, and manual extension boundary documentation/example).

## 2026-04-05 - PRD #1 / Child #7 - Safe planning and project targeting guards (task slice: unknown project targeting hard-fail)

### Task completed

- Added explicit CLI project targeting support via repeated `--project <id>` and `--project=<id>` flags in core CLI parsing.
- Wired targeted project ids into generation execution options.
- Added deterministic hard-fail behavior when a requested project id does not exist in config.
- Added focused tests for both CLI parsing and unknown-target failure diagnostics.

### Key decisions

- Kept scope to one smallest tracer-bullet slice from child #7: unknown project id targeting semantics only.
- Preserved current single-project guardrail behavior and did not broaden into output-boundary or collision checks in this iteration.
- Used deterministic error code/message contract for missing target ids: `QCE_PROJECT_TARGET_UNKNOWN`.

### Key findings

- Child issue selection for `next` resolved to #7 as the lowest-number open child unblocked by closed issue #5.
- Existing generator pipeline could accept target filtering with minimal surface-area changes by extending `GenerateOptions`.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable in this repository; pnpm workspace equivalents are still required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/config.test.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #7 remains open; remaining slices include workspace-boundary output path rejection and cross-project output-collision guards.

## 2026-04-05 - PRD #1 / Child #7 - Safe planning and project targeting guards (task slice: workspace-boundary output path rejection)

### Task completed

- Added deterministic planning-time guard that rejects project output paths resolving outside the workspace root.
- Added focused generator test coverage proving outside-workspace `outDir` fails before generation proceeds.

### Key decisions

- Kept this slice to one acceptance-criteria task only: output workspace-boundary safety.
- Implemented the guard in generation orchestration path (before source read/write operations) to preserve fail-fast safety behavior.
- Used dedicated deterministic error code/message contract: `QCE_OUTPUT_OUTSIDE_WORKSPACE`.

### Key findings

- Existing flow allowed `outDir` values like `../outside-generated` to escape the workspace and plan writes in parent directories.
- Relative-path boundary checks via `path.relative(workspaceRoot, resolvedOutDir)` were sufficient for this slice and kept implementation small.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents continue to be required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #7 remains open; unresolved acceptance criterion is planning-time resolved output collision detection across projects.

## 2026-04-05 - PRD #1 / Child #7 - Safe planning and project targeting guards (task slice: resolved output collision detection)

### Task completed

- Added planning-time resolved output collision detection across targeted projects before generation writes.
- Generator now fails deterministically when two project `outDir` values resolve to the same absolute directory.
- Added focused test coverage for normalized-path collisions (for example `./src/generated` and `./src/../src/generated`).

### Key decisions

- Kept this slice narrowly scoped to collision detection only, with no broad execution-model refactor.
- Moved output safety validation into a shared planning pass over selected projects so safety checks run before the current single-project execution guard.
- Used dedicated deterministic error code/message contract: `QCE_OUTPUT_PATH_COLLISION`.

### Key findings

- Prior behavior surfaced only `QCE_GENERATION_UNSUPPORTED` for multi-project configs, which masked actionable collision diagnostics.
- Sorting selected projects by id before safety validation preserves deterministic owner ordering in collision errors.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents continue to be required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #7 acceptance criteria are now satisfied by completed slices: unknown target id hard-fail, outside-workspace output path rejection, and resolved output collision detection.

## 2026-04-05 - PRD #1 / Child #8 - Multi-project sequential execution path (task slice: remove single-project guardrail and execute all selected projects)

### Task completed

- Enabled multi-project generation execution in core by removing the single-project restriction and allowing all selected projects to run through the existing sequential loop.
- Added focused coverage proving two projects execute in deterministic id order in a single generation run.

### Key decisions

- Kept this as one smallest tracer-bullet slice for child #8: execution enablement + deterministic ordering proof only.
- Preserved existing planning-time safety checks (workspace-boundary and output-collision validation) and existing project-target filtering behavior.
- Deferred issue #8 remaining acceptance criteria decomposition to subsequent slices if needed (for example explicit CLI non-zero assertion coverage).

### Key findings

- Existing implementation already sorted selected projects by id and executed sequentially; the primary blocker was the explicit `QCE_GENERATION_UNSUPPORTED` guard.
- Removing the guard was sufficient to unlock multi-project sequential behavior while preserving deterministic output ordering.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents are required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #8 remains open; this slice completed deterministic multi-project sequential execution enablement.
- Next logical child #8 slice is explicit CLI-level non-zero semantics coverage for mixed multi-project success/failure scenarios.

## 2026-04-05 - PRD #1 / Child #8 - Multi-project sequential execution path (task slice: CLI non-zero semantics coverage for mixed multi-project outcomes)

### Task completed

- Added CLI-level regression coverage proving non-zero exit semantics when any project fails during a multi-project run.
- Added a focused `runCli` test that executes with two projects where one source is intentionally missing and asserts:
  - exit code is `1`
  - deterministic error reporting includes `QCE_CEM_READ_FAILED`

### Key decisions

- Kept this slice test-focused to validate issue #8 acceptance criteria without expanding runtime behavior scope.
- Used `process.chdir(tempDir)` in the test harness so CLI relative-path resolution matches real invocation behavior.
- Preserved existing generation/orchestration behavior and only added coverage for documented non-zero semantics.

### Key findings

- CLI path resolution is anchored to process cwd; test harness must control cwd for deterministic fixture execution.
- Existing implementation already satisfies non-zero behavior when any sequential project fails; this slice adds explicit contract protection.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents are required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first due to test harness cwd assumption, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types` (passed)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #8 may now be complete against stated acceptance criteria (sequential multi-project execution, deterministic order, and non-zero on project failure).
- Next logical step is either close child #8 after verification or continue to child #9.

## 2026-04-05 - PRD #1 / Child #9 - Multi-project parallel execution path (task slice: explicit parallel mode enablement + execution branch)

### Task completed

- Added explicit CLI support for parallel mode via `--parallel`.
- Wired CLI parallel mode into generation config for execution.
- Added parallel execution branch in core generation orchestrator while preserving deterministic project result ordering by sorted id.
- Added focused test coverage for CLI `--parallel` parsing and parallel-mode generation path behavior.

### Key decisions

- Kept scope to one smallest tracer-bullet slice for child #9: explicit mode enablement and execution-path wiring only.
- Preserved deterministic project ordering by continuing to sort selected projects before execution and collecting parallel results in sorted input order.
- Deferred buffered per-project log emission and aggregate-all-failures reporting details to subsequent child #9 slices.

### Key findings

- `parallel` config support already existed in config schema; the main gap was CLI flag plumbing and generation orchestration branching.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents continue to be required.

### Validation loops run

- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter @qwik-custom-elements/core run check-types` (closest equivalent; passed)
- `pnpm --filter @qwik-custom-elements/core run test` (closest equivalent; passed)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/config.test.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #9 remains open; remaining acceptance-criteria slices include buffered deterministic post-run log printing and aggregate failure reporting that includes all failed projects.

## 2026-04-05 - PRD #1 / Child #9 - Multi-project parallel execution path (task slice: aggregate failure reporting across parallel projects)

### Task completed

- Switched parallel project execution from fail-fast `Promise.all(...)` behavior to aggregate `Promise.allSettled(...)` handling.
- Added deterministic aggregated failure reporting when one or more parallel projects fail.
- Added focused regression coverage proving multiple parallel project failures are reported together with stable project-id diagnostics.

### Key decisions

- Kept this slice narrow to one acceptance-criteria concern: aggregate failure reporting in parallel mode.
- Preserved deterministic ordering by iterating settled results using already sorted project-id input order.
- Used a dedicated deterministic aggregate error code (`QCE_PARALLEL_PROJECT_FAILURES`) while retaining per-project underlying error codes in the message payload.

### Key findings

- Previous parallel implementation masked additional failures by surfacing only the first rejected project.
- `Promise.allSettled(...)` enabled full-failure visibility without changing sequential execution behavior.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents continue to be required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter @qwik-custom-elements/core run check-types` (closest equivalent; passed)
- `pnpm --filter @qwik-custom-elements/core run test` (closest equivalent; passed)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/generator.ts`
- `packages/core/src/__tests__/generator.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #9 remains open; buffered per-project logs printed after completion in deterministic order are still pending.

## 2026-04-05 - PRD #1 / Child #9 - Multi-project parallel execution path (task slice: buffered deterministic per-project log output)

### Task completed

- Added CLI output behavior for parallel runs that prints per-project buffered log lines after generation completes.
- Ensured log emission order is deterministic by using generation results already sorted by project id.
- Added focused CLI-level regression coverage that validates:
  - per-project log lines are emitted for parallel mode,
  - `a-project` logs print before `z-project` logs,
  - the final run summary prints after per-project lines.

### Key decisions

- Kept this slice narrowly scoped to output behavior in `runCli(...)` without broad generator refactors.
- Emitted per-project logs only for parallel mode to align with issue #9 buffered-log acceptance criteria.
- Used stable one-line per-project summaries (`[project:<id>] mode=<mode> plannedWrites=<n>`) for deterministic CI-friendly output.

### Key findings

- Existing deterministic project ordering from generation orchestration made this slice straightforward to verify at CLI output level.
- Root `npm run typecheck`, `npm run test`, and `npm run format` remain unavailable; pnpm workspace equivalents continue to be required.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `npm run typecheck` (missing script at repo root)
- `npm run test` (missing script at repo root)
- `pnpm --filter @qwik-custom-elements/core run check-types` (closest equivalent; passed)
- `pnpm --filter @qwik-custom-elements/core run test` (closest equivalent; passed)
- `pnpm turbo run check-types` (workspace equivalent; passed)
- `pnpm -r --if-present run test` (workspace equivalent; passed)
- `npm run format` (missing script at repo root)
- `pnpm -r --if-present run format` (no format scripts present in workspace packages)

### Files changed

- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #9 acceptance criteria appear satisfied by completed slices (explicit parallel mode, deterministic buffered per-project logs, aggregate failure reporting with non-zero semantics).
- Next step is verifying and closing child issue #9 if no additional scope is required.

## 2026-04-05 - PRD #1 / Child #11 prep - real Stencil fixture library migration and test stabilization

### Task completed

- Replaced the placeholder `packages/test-stencil-lib` fixture with a real StencilJS library migrated from the `qwik-stenciljs/stencil-js-lib` POC.
- Ensured the fixture package is buildable in this monorepo (`pnpm --filter @qwik-custom-elements/test-stencil-lib build`).
- Hardened ignore rules for generated Stencil outputs and test artifacts.
- Fixed a flaky/failing browser component test by waiting for Stencil component readiness before querying rendered internals.

### Key decisions

- Preserved monorepo package identity for fixture usage (`@qwik-custom-elements/test-stencil-lib`, private) while keeping Stencil build/test scripts.
- Excluded transient copy artifacts during migration (`node_modules`, `.stencil`, `package-lock.json`).
- Ignored generated outputs as authoritative build artifacts (`dist`, `loader`, `hydrate`, `www`) and added `.vitest-attachments` ignore coverage.

### Key findings

- Initial build failure was environmental (`stencil` not found) due to missing dependency install; `pnpm install` resolved it.
- Browser test failure root cause was timing, not generator/runtime regression; `componentOnReady()` resolved null DOM query timing in browser mode.
- Workspace regression check passed after fix (`pnpm -r --if-present test`), including:
  - `packages/core`: 23/23 tests passed
  - `packages/test-stencil-lib`: 5/5 tests passed

### Validation loops run

- `pnpm --filter @qwik-custom-elements/test-stencil-lib build` (failed before install, then passed)
- `pnpm install`
- `pnpm -r --if-present test` (revealed browser test timing failure, then passed after fix)
- `pnpm --filter @qwik-custom-elements/test-stencil-lib exec playwright install chromium`
- `pnpm --filter @qwik-custom-elements/test-stencil-lib exec vitest run --config vitest.config.ts --project browser src/components/de-button/de-button.cmp.test.ts`
- `git status --short --ignored -- packages/test-stencil-lib/dist packages/test-stencil-lib/loader packages/test-stencil-lib/hydrate packages/test-stencil-lib/www`

### Files changed

- `.gitignore`
- `packages/test-stencil-lib/.gitignore`
- `packages/test-stencil-lib/package.json`
- `packages/test-stencil-lib/custom-elements.json`
- `packages/test-stencil-lib/src/components/de-button/de-button.cmp.test.ts`
- `packages/test-stencil-lib/*` (real Stencil source/config/runtime fixture files migrated from POC)
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- This work is a preparatory slice for child issue #11 and de-risks upcoming adapter-stencil SSR parity work by replacing a mock fixture with a real Stencil library and verified test/build path.

## 2026-04-05 - PRD #1 / Child #11 prep - real Qwik demo app migration from POC and integration verification

### Task completed

- Replaced the placeholder `apps/qwik-demo` scaffold with the real Qwik app migrated from `qwik-stenciljs/qwik-app` POC.
- Reconciled monorepo path assumptions so the migrated app resolves runtime assets from `packages/test-stencil-lib`.
- Updated copied npm-oriented scripts to pnpm-oriented scripts in the migrated app package.
- Verified the migrated app builds successfully and does not regress existing workspace tests.

### Key decisions

- Used full mirror migration for `apps/qwik-demo` to ensure the destination is a true runnable Qwik app before child #11 work.
- Kept reconciliation changes narrow to path/package-manager compatibility only:
  - `scripts/sync-stencil-assets.ts` now reads from `../../packages/test-stencil-lib`.
  - `vite.config.ts` now allows and resolves `../../packages/test-stencil-lib`.
  - generator config now points `stencilPath` to `../../packages/test-stencil-lib`.
- Preserved previous repository work-in-progress changes and did not revert unrelated modifications.

### Key findings

- The previous `apps/qwik-demo` content was a lightweight generated-wrapper harness; full mirror migration replaced that structure with a complete QwikCity-capable app layout.
- Build succeeds after syncing stencil runtime assets from the migrated real stencil fixture package.
- Workspace regression checks remain green after migration.

### Validation loops run

- `pnpm -C C:\Source\qwik-custom-elements install`
- `pnpm -C C:\Source\qwik-custom-elements\packages\test-stencil-lib build`
- `pnpm -C C:\Source\qwik-custom-elements\apps\qwik-demo build`
- `pnpm -C C:\Source\qwik-custom-elements -r --if-present test`

### Files changed

- `apps/qwik-demo/*` (full app structure mirrored from POC and reconciled for monorepo paths)
- `apps/qwik-demo/package.json`
- `apps/qwik-demo/scripts/sync-stencil-assets.ts`
- `apps/qwik-demo/scripts/generate-qwik-from-stenciljs/generator.config.json`
- `apps/qwik-demo/vite.config.ts`
- `pnpm-lock.yaml`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- No blocker for entering child issue #11 with real app + real stencil fixture context now in place.
- Next iteration can focus directly on adapter-stencil SSR parity behavior using this migrated baseline.

## 2026-04-06 - PRD #1 / Child #11 prep - cleanup of POC-era generation/copying approach in qwik-demo

### Task completed

- Removed legacy generated wrapper artifacts under `apps/qwik-demo/src/components/generated/stencil` that came from the prior POC-oriented generation flow.
- Removed the old in-app generator script subtree at `apps/qwik-demo/scripts/generate-qwik-from-stenciljs`.
- Removed the old stencil runtime copy script `apps/qwik-demo/scripts/sync-stencil-assets.ts`.

### Key decisions

- Decided not to continue with the previous POC approach that generated Qwik components from Stencil components directly inside `apps/qwik-demo`.
- Kept the migrated Qwik app while removing now-obsolete generation/copying implementation details that are not part of the new project direction.

### Key findings

- The cleanup reduces confusion by removing stale generated files and scripts that no longer represent the intended architecture.
- The Qwik app migration remains intact while POC-specific shims/shenanigans are removed.

### Validation loops run

- `git status --short` (verified expected cleanup deletions)

### Files changed

- `apps/qwik-demo/scripts/generate-qwik-from-stenciljs/*` (deleted)
- `apps/qwik-demo/scripts/sync-stencil-assets.ts` (deleted)
- `apps/qwik-demo/src/components/generated/stencil/*` (deleted)
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- No blocker introduced by this cleanup; next work for child #11 can proceed on the simplified migrated app baseline.

## 2026-04-06 - PRD #1 / Child #11 prep - qwik-demo startup decoupling from stale POC stencil sync path

### Task completed

- Removed stale POC coupling from `apps/qwik-demo` startup/build scripts that still required Stencil runtime copy artifacts.
- Replaced the home route with a minimal baseline page that does not import generated Stencil wrappers.
- Verified root startup path no longer fails on missing `packages/test-stencil-lib/dist/esm` during app boot.

### Key decisions

- Keep `apps/qwik-demo` runnable as an almost-empty baseline app while child #11 implementation work continues.
- Treat remaining Stencil-specific files in the app as follow-up cleanup scope, not part of this immediate startup-unblock slice.
- Preserve Turborepo root startup flow (`npm start` -> `pnpm dev:qwik-demo` -> `turbo run dev --filter=qwik-demo`).

### Key findings

- The breakage came from `apps/qwik-demo/package.json` scripts (`dev`, `build`, `preview`) chaining `sync:stencil-assets`, which executed a script that now fails after POC cleanup.
- Home route still referenced generated Stencil wrappers (`src/components/generated/stencil`) even though the app target is currently minimal baseline.
- After decoupling scripts and simplifying home route, the dev server starts successfully through both package-level and root-level commands.

### Validation loops run

- `pnpm --filter qwik-demo run check-types`
- `pnpm --filter qwik-demo run dev` (confirmed Vite ready)
- `npm start` (confirmed Turborepo starts `qwik-demo#dev` without the previous missing-Stencil-source error)

### Files changed

- `apps/qwik-demo/package.json`
- `apps/qwik-demo/src/routes/index.tsx`

### Blockers / notes for next iteration

- No blocker for startup.
- Additional cleanup pass is still recommended to remove remaining POC-era Stencil artifacts in `apps/qwik-demo` (unused Stencil routes/helpers, Vite Stencil defines/fs-allow, and stale env declarations) so the app baseline is fully consistent.

## 2026-04-06 - PRD #1 / Child #12 planning note - open-wc custom-elements-manifest triage and issue placement

### Task completed

- Triaged potential use of `open-wc/custom-elements-manifest` against current PRD scope and active child issues.
- Posted scoped guidance to child issue #12 and parent PRD issue #1.

### Key decisions

- Primary placement is child issue #12 because it owns Lit baseline CEM-path integration and fallback behavior.
- Usage, if adopted, is build/test-time support for CEM generation or normalization in Lit fixture flows.
- Explicitly out of scope for #12: adding runtime dependency coupling in adapter packages and broad cross-project schema hardening.

### Key findings

- Current architecture boundaries remain unchanged: core/generation tooling owns CEM parsing; adapters remain runtime integration plus metadata/fallback.
- PRD text already supports this placement, so no PRD markdown edits were required for this planning update.

### Validation loops run

- `gh issue view 12 -R DmitryEfimenko/qwik-custom-elements --comments`
- `gh issue view 1 -R DmitryEfimenko/qwik-custom-elements --comments`
- `gh issue comment 12 -R DmitryEfimenko/qwik-custom-elements --body <multiline-note>`
- `gh issue comment 1 -R DmitryEfimenko/qwik-custom-elements --body <multiline-note>`

### Files changed

- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- No blocker. This is a planning-only update; no implementation work was started.

## 2026-04-06 - PRD #1 / Child #10 - Run summary artifact contract (task slice: resolved core/adapter versions in summary projects)

### Task completed

- Extended run summary project entries to include resolved version fields for both core and adapter package versions.
- Wired generation metadata so summary emission can resolve adapter versions from the project adapter package reference.
- Extended CLI summary regression coverage to validate deterministic `resolvedCoreVersion` and `resolvedAdapterVersion` fields.

### Key decisions

- Kept this iteration as one narrow tracer-bullet slice for child #10: version-field coverage only.
- Resolved package versions from monorepo package manifests with safe `unknown` fallback when a package manifest cannot be resolved.
- Left failure/skipped project status expansion and non-empty observed error code aggregation for a follow-up slice.

### Key findings

- Summary emission already had deterministic ordering and baseline timing/status fields, so this slice required only metadata and writer enrichment.
- Existing adapter package naming made deterministic version lookup straightforward from package manifest paths.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test`
- `pnpm --filter @qwik-custom-elements/core run check-types`
- `npm run typecheck`
- `npm run test`
- `npm run format`

### Files changed

- `packages/core/src/types.ts`
- `packages/core/src/generator.ts`
- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #10 remains open; summary coverage still needs deterministic failed/skipped project statuses and observed error code aggregation when runs include failures.

## 2026-04-06 - PRD #1 / Child #10 - Run summary artifact contract (task slice: failed-run summary emission with deterministic observed error codes)

### Task completed

- Added failed-run summary emission in core CLI when generation throws a deterministic `GenerationError`.
- Emitted run-level `observedErrorCodes` in summary JSON from the failure code path using sorted unique normalization.
- Added focused CLI regression coverage proving failed runs still write the configured summary artifact and include expected error code entries.

### Key decisions

- Kept this slice narrowly scoped to run-level observed error code emission on failed runs; per-project failed/skipped status modeling remains follow-up scope.
- Reused existing summary writer with a minimal empty-project fallback payload for failure scenarios.
- Preserved existing non-zero exit behavior for failed generation runs.

### Key findings

- Prior behavior returned non-zero on generation errors but skipped summary emission entirely, leaving machine-readable diagnostics empty.
- Run-level error-code emission can be added without broad generator orchestration changes.

### Validation loops run

- `pnpm --filter @qwik-custom-elements/core run test` (RED expected failure first, then GREEN pass)
- `pnpm --filter @qwik-custom-elements/core run check-types`
- `npm run typecheck`
- `npm run test`
- `npm run format`

### Files changed

- `packages/core/src/cli.ts`
- `packages/core/src/__tests__/config.test.ts`
- `.prd/progress/progress-for-prd-1.md`

### Blockers / notes for next iteration

- Child #10 remains open; next smallest slice is per-project failed/skipped status representation in summary `projects[]` rather than failure-only run-level fallback.
