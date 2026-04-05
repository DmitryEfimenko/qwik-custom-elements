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
