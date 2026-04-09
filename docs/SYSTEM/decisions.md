# Decisions

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
