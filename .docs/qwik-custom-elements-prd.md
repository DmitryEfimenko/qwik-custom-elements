# Qwik Custom Elements Migration Handoff (Comprehensive)

Purpose: preserve the full set of planning/grill decisions across workspace/repo changes.

## 1) Repository + Workspace Strategy
- New repo local path: `C:/Source/qwik-custom-elements`.
- Monorepo stack: Turborepo + pnpm.
- Start from a fresh repo and migrate validated pieces in phases.
- Keep old repo available as reference during migration; archive old repo read-only after cutover gates pass.
- Preferred workspace shape: `apps/` + `packages/`.

## 2) Package Topology
- Publishable packages (npm public under `@qwik-custom-elements`):
  - `@qwik-custom-elements/core`
  - `@qwik-custom-elements/adapter-stencil`
  - `@qwik-custom-elements/adapter-lit`
- Private fixture packages:
  - `packages/test-stencil-lib`
  - `packages/test-lit-lib`
- Initial app target:
  - `apps/qwik-demo`

## 3) Architecture Boundaries (Locked)
- Generator ownership: all wrapper-generation APIs live in `@qwik-custom-elements/core`.
- Adapter ownership: runtime integration + metadata enrichment/fallback only.
- No adapter `/generator` API.
- Adapter subpaths are allowed.
- Canonical Lit SSR subpath: `@qwik-custom-elements/adapter-lit/ssr`.
- Canonical adapter metadata helper subpath: `/metadata`.

## 4) Product Scope + Non-Goals
- Stable in v1:
  - CEM-only generation for any valid CEM source.
  - Stencil adapter SSR parity path.
- Included in v1:
  - Lit SSR POC (single happy-path demo component).
- SSR fallback rule:
  - If adapter SSR path is unavailable/unsupported, auto-fallback to CEM-only + warning.
- Deferred/out-of-scope in v1:
  - FAST adapter implementation.
  - Shoelace-specific adapter implementation.
  - Watch mode.
  - Local generation cache.

## 5) Turborepo Migration Order
1. Bootstrap fresh Turborepo skeleton.
2. Move core generator package first.
3. Move stencil adapter/runtime.
4. Add lit adapter with CEM path + SSR POC.
5. Wire demo app with `workspace:*` dependencies.
6. Enforce CI drift + compatibility checks.
7. Cut over and archive old repo.

Adapter rollout order:
- `adapter-stencil` before `adapter-lit` POC.

## 6) Release + Versioning Policy
- Independent versioning across publishable packages.
- Initial release line: `0.x`.
- During `0.x`:
  - Breaking changes are allowed in minor releases.
  - Publish directly to `latest` (no default `next` canary).
  - Latest-only support (no backports).
  - Immediate removal allowed for breaking changes (no mandatory deprecation window).
  - Every breaking release must include a `BREAKING` section in notes.
- 1.0 promotion:
  - Maintainer-discretion (no automatic gate).

## 7) Compatibility Matrix Policy
- Maintain explicit compatibility matrix across core/adapters.
- File path: `/compatibility-matrix.json`.
- Format: JSON.
- Matrix axes:
  - core version range
  - adapter version range
  - Qwik peer range
  - Node range
- Coverage:
  - tested combos only (no inferred compatibility claims)
- Update policy:
  - base rule: update on breaking changes
  - `0.x` exception: update on breaking minors as well
- CI policy:
  - fail if required matrix update is missing for applicable breaking release

## 8) Governance + Collaboration
- No mandatory RFC process during early `0.x`.
- Revisit RFC policy if/when adoption increases.
- PR gate:
  - at least one approval for core/adapter changes
- Required checks before merge:
  - tests
  - typecheck
  - lint
- Add package-level CODEOWNERS.
- Each published package must include a concise README (install, quickstart, support policy).

## 9) Core CLI + Config Contract
- Single core CLI entrypoint.
- Explicit adapter selection required (no inference).
- Explicit adapter package references required (no auto-discovery).
- Strict adapter option schemas with fail-fast validation.
- Default config path: `/qwik-custom-elements.config.json`.
- Config variants:
  - default JSON
  - optional JS config variant for advanced/dynamic scenarios

## 10) Multi-Project Generation Model (Locked)
- Required `projects[]` array.
- Each project requires:
  - `id` (unique)
  - `adapter`
  - `adapterPackage`
  - `source`
  - `outDir`
  - `cleanOutput`
  - `adapterOptions`
- Supports mixed adapters and multiple libraries in one run.
- Safety rules:
  - unique resolved `outDir` per project
  - reject output paths outside workspace root
  - hard-fail on output path collisions
- CLI targeting:
  - allow project filtering by id
  - unknown requested project id => non-zero failure

## 11) Execution, Parallelism, Logging
- Sequential is default.
- Optional parallel mode in v1.
- Parallel implementation simplicity:
  - Promise-based fan-out (no worker pool)
  - `allSettled`-style aggregate failure reporting
- Determinism:
  - planning and summaries sorted by project id
- Logging policy:
  - sequential: live streamed logs
  - parallel: buffered per-project logs, printed post-completion in deterministic order
  - no live parallel progress counters

## 12) Output + Formatting + Customization
- `cleanOutput` is per-project.
- Dry-run mode supported (validate + planned writes; no fs mutation).
- Formatting:
  - deterministic raw output by default
  - optional Prettier formatting flag
- Generated-file provenance:
  - stable headers with project id
  - no timestamps in file headers
- Overwrite policy:
  - generated files are authoritative and overwritten by default
- Customization pattern:
  - do not edit generated wrappers directly
  - use a formal manual extension layer in sibling directories
  - generated and manual indexes remain separate
- Directory conventions:
  - sensible defaults
  - customizable via per-project options
  - path templates supported (e.g. `{projectId}`)
- Manual wrapper path:
  - optional per project (generated-only mode allowed)

## 13) Source Control + CI Drift
- Generated wrappers are committed to git in app/demo.
- CI drift check runs all configured projects.
- CI fails on generated drift.
- CI generation mode always fresh (no cache shortcuts).
- Local generation cache/skip mode deferred from v1.

## 14) Run Summary Artifact Contract
- Root run summary default path: `/generated-run-summary.json`.
- Include:
  - `schemaVersion`
  - run-level `startedAt`/`finishedAt`
  - per-project status: `success|failed|skipped`
  - per-project duration
  - resolved core version and adapter version per project
  - import-ready generated index path
  - observed `errorCodes`
- Observed error codes in summary:
  - unique + alphabetically sorted
- Stack traces:
  - excluded from summary JSON
  - emitted in logs only

## 15) Exit-Code Semantics
- Overall run exits non-zero if any project fails.
- If all targeted projects are skipped => non-zero with dedicated code.

## 16) Error Code Policy (0.x Flexible)
- Canonical list is maintained as a current snapshot (not frozen contract).
- Enum is flexible during `0.x`.
- Consumers must tolerate unknown codes.
- Schema version does not need to bump for code-value changes alone.
- Current snapshot:
  - `CONFIG_INVALID`
  - `PROJECT_FAILED`
  - `NO_PROJECTS_EXECUTED`
  - `OUTPUT_PATH_OUTSIDE_WORKSPACE`
  - `OUTPUT_PATH_COLLISION`
  - `ADAPTER_PACKAGE_NOT_FOUND`
  - `ADAPTER_UNKNOWN`
  - `ADAPTER_OPTIONS_INVALID`
  - `SOURCE_METADATA_MISSING`
  - `CEM_PARSE_FAILED`
  - `ADAPTER_METADATA_UNRESOLVED`

## 17) Cutover Gates
- Gate A: stencil parity proven.
- Gate B: lit SSR POC proven.
- Gate C: CEM-only compatibility checks passing.
- After all pass: archive old repo as read-only and redirect to new Turborepo.

## 18) Practical Kickoff Note
When you start in the new workspace, keep both repos open in the same VS Code workspace so migration work can reference old code directly while implementing new packages.
