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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

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
- `.docs/progress.md`

### Blockers / notes for next iteration
- Child #9 acceptance criteria appear satisfied by completed slices (explicit parallel mode, deterministic buffered per-project logs, aggregate failure reporting with non-zero semantics).
- Next step is verifying and closing child issue #9 if no additional scope is required.
