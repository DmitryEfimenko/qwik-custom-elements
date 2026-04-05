# Progress Log

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

### Blockers / notes for next iteration
- Child #6 remains open; this slice only proves generated-wrapper consumption wiring.
- Next logical child #6 slices are deterministic re-run/no-diff verification and documenting/manual extension boundary in demo context.
