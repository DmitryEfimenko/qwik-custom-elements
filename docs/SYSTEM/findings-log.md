# Findings Log

# Findings Log

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
  - Use `runtime-csr.generated.ts` for the generated client runtime leaf while keeping `runtime.ts` as the stable app-facing barrel.
  - Reserve `runtime-ssr.generated.ts` for SSR-only helpers and keep the client leaf loader-only.

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
  - In workspace apps that consume local adapter subpaths, add explicit `tsconfig` `paths` mappings to source entrypoints (for example `@qwik-custom-elements/adapter-stencil/client` and `/ssr`) so local typecheck is stable independent of prebuilt package outputs.
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
