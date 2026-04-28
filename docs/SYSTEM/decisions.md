# Decisions

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
