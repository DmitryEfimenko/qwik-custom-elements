## Problem Statement

The migration from a single demo repository to a production-ready monorepo for Qwik custom-element integration needs to preserve proven behavior while adding maintainable package boundaries, deterministic generation, CI drift protection, and clear release governance. Right now, the new repository is only a bare Turborepo scaffold, so there is no end-to-end implementation path yet for generating wrappers, integrating adapters, proving SSR behavior, or enforcing compatibility and release policies.

From the maintainer perspective, the core problem is balancing speed and reliability during a phased migration: the team must move validated behavior from the existing qwik-stenciljs demo into a new pnpm + Turborepo architecture without losing parity, while also introducing strict contracts for multi-project generation, safety checks, summary artifacts, and predictable versioning.

## Solution

Build a phased monorepo implementation centered on a core generation package with explicit adapter contracts, plus adapter packages for Stencil and Lit. The core package owns generation APIs and CLI orchestration for multi-project runs. Adapter packages own runtime integration and metadata enrichment only, including SSR-specific behavior where supported.

The migration proceeds in tracer-bullet vertical slices that each deliver a testable end-to-end path. Stencil parity is delivered first, then Lit SSR POC, then CI/governance hardening. Output determinism, strict validation, and run summaries are built in from the start so generated artifacts can be committed and verified in CI.

## User Stories

1. As a monorepo maintainer, I want the repository organized into apps and packages workspaces, so that code ownership and build boundaries are clear from day one.
2. As a package maintainer, I want independent publishable packages for core and adapters, so that each package can evolve and release on its own lifecycle.
3. As a generator user, I want one CLI entrypoint, so that running generation has a single predictable interface.
4. As a generator user, I want explicit adapter selection per project, so that generation behavior is deterministic and not inferred.
5. As a generator user, I want explicit adapter package references, so that adapter resolution is transparent and debuggable.
6. As a maintainer, I want strict config validation with fail-fast behavior, so that invalid runs fail early with actionable errors.
7. As a maintainer, I want a required projects array in config, so that each generation target is explicit and independently operable.
8. As a maintainer, I want each project to have a stable id, so that targeting, logs, and summaries remain consistent over time.
9. As a maintainer, I want project-level source, output, and adapter options fields, so that mixed libraries and adapters can be run in one invocation.
10. As a maintainer, I want output directories to be unique and validated, so that accidental overwrite or collision is prevented.
11. As a maintainer, I want output paths outside the workspace to be rejected, so that generation cannot mutate arbitrary filesystem locations.
12. As a maintainer, I want unknown project filters to fail non-zero, so that CI and scripts catch typos immediately.
13. As a maintainer, I want a default config path, so that standard usage requires minimal setup.
14. As an advanced user, I want an optional JS config mode, so that dynamic configuration remains possible when needed.
15. As a developer, I want dry-run support, so that planned writes can be reviewed without mutating files.
16. As a maintainer, I want deterministic generated output by default, so that version control diffs stay meaningful.
17. As a maintainer, I want stable provenance headers without timestamps, so that generated files are attributable without non-deterministic noise.
18. As a maintainer, I want generated files to be authoritative by default, so that regeneration is reliable and reproducible.
19. As a developer extending wrappers, I want a separate manual extension layer, so that regeneration does not destroy manual customization.
20. As a maintainer, I want sequential execution as the default, so that logs are easy to follow and failures are simpler to diagnose.
21. As a maintainer, I want optional parallel execution, so that larger multi-project runs can be accelerated when needed.
22. As a maintainer, I want deterministic per-project log ordering in parallel mode, so that output is stable and reviewable.
23. As a maintainer, I want aggregate failure reporting for parallel runs, so that all project outcomes are visible in one pass.
24. As a maintainer, I want a run summary artifact at the repository root, so that CI and tooling can parse run outcomes programmatically.
25. As a maintainer, I want run summaries to include schema version, timing, per-project status, durations, and resolved versions, so that operational diagnostics are complete.
26. As a maintainer, I want observed error codes in summaries to be unique and sorted, so that machine consumption is stable.
27. As a maintainer, I want stack traces omitted from summary JSON, so that summary artifacts remain compact and structured.
28. As a maintainer, I want non-zero exit when any project fails, so that CI gates behave correctly.
29. As a maintainer, I want a dedicated non-zero code when no projects execute, so that skip scenarios are explicit.
30. As a package maintainer, I want CEM-only generation to be stable in v1, so that baseline adapter-agnostic workflows are trustworthy.
31. As a framework integrator, I want Stencil SSR parity behavior migrated first, so that the known integration path is preserved.
32. As a framework integrator, I want Lit support with a constrained SSR POC, so that adapter-lit can be validated without overcommitting scope.
33. As a maintainer, I want automatic fallback to CEM-only with warnings when SSR support is unavailable, so that generation remains useful under partial capability.
34. As a maintainer, I want generated wrappers committed in demo/app repos, so that drift is visible in pull requests.
35. As a maintainer, I want CI drift checks to regenerate fresh outputs and fail on mismatch, so that committed artifacts remain canonical.
36. As a release manager, I want an explicit compatibility matrix across core, adapters, Qwik peer range, and Node range, so that tested combinations are transparent.
37. As a release manager, I want compatibility matrix updates enforced for breaking changes in 0.x, so that consumers get accurate support signals.
38. As a maintainer, I want independent 0.x versioning with documented BREAKING notes, so that rapid iteration remains explicit and controlled.
39. As a collaborator, I want required checks for tests, typecheck, and lint before merge, so that quality gates are consistent.
40. As a collaborator, I want package-level ownership and concise package READMEs, so that contribution paths and support policy are unambiguous.
41. As a migration lead, I want explicit cutover gates for stencil parity, lit SSR POC, and CEM compatibility, so that repository archival happens only after proven readiness.
42. As a migration lead, I want both old and new repos available during migration, so that implementation can reference validated prior behavior.

## Implementation Decisions

- Monorepo architecture uses pnpm workspaces and Turborepo, with apps and packages as first-class boundaries.
- Publishable package topology is fixed to three public packages: core, adapter-stencil, and adapter-lit.
- Private fixture libraries are included for integration validation and adapter behavior verification.
- Core package owns all wrapper generation APIs and the single CLI orchestration interface.
- Adapter packages do not expose generator APIs; adapters only implement runtime integration and metadata enrichment/fallback behavior.
- Adapter subpath exports are allowed; canonical subpaths include an SSR entry for Lit and metadata helper exports.
- Multi-project generation model is mandatory via a required projects list in configuration.
- Each project contract includes unique identity, adapter identity, adapter package reference, source metadata location, output configuration, cleanup behavior, and adapter options.
- Core planner validates output safety before writes, including workspace-boundary checks and collision detection across resolved output directories.
- Project filtering by id is supported; unknown ids are treated as hard failures.
- Execution defaults to sequential mode and may optionally run in parallel with aggregate settled-result handling.
- Parallel mode buffers project logs and prints in deterministic order by project id.
- Deterministic output is the default format policy; optional prettification can be enabled without changing semantics.
- Generated files include stable provenance metadata and intentionally exclude timestamps.
- Generated outputs are authoritative and replaced on regeneration by default.
- Manual customization is implemented as a separate extension layer adjacent to generated wrappers.
- Root-level run summary artifact is always produced with a versioned schema and normalized project outcomes.
- Error code catalog is flexible in 0.x and consumers must tolerate unknown values.
- Exit semantics are explicit: any failure yields non-zero, and all-targeted-skipped has a dedicated non-zero outcome.
- Migration order is fixed: bootstrap skeleton, move core, move stencil adapter/runtime, add lit adapter with constrained SSR POC, wire demo app, enforce CI and compatibility checks, then cut over.
- Compatibility matrix is maintained as tested combinations only, never inferred combinations.
- Release policy is independent package versioning under 0.x with breaking minors allowed and mandatory BREAKING release-note sections.
- Governance policy requires one approval for core/adapter changes and mandatory quality checks before merge.

Major modules and deep-module boundaries:

- Core Configuration and Validation Engine: accepts config input and returns a normalized, validated run plan plus explicit validation errors.
- Core Planning and Execution Orchestrator: turns validated projects into deterministic execution plans and aggregate run outcomes.
- Core Output Writer: applies clean/write policies, provenance headers, and deterministic file emission behind a narrow interface.
- Adapter Capability Contract: provides a stable surface for metadata enrichment, SSR capability probing, and fallback signaling.
- Stencil Integration Module: encapsulates Stencil-specific SSR/runtime concerns behind adapter contract boundaries.
- Lit Integration Module: encapsulates Lit-specific metadata and constrained SSR POC behavior behind adapter contract boundaries.
- Summary and Error Reporting Module: centralizes schema-compliant run summary emission and error-code normalization.
- CI Drift and Compatibility Gate Module: validates generated drift and policy compliance for compatibility matrix updates.

## Testing Decisions

- A good test verifies externally observable behavior and contract outcomes, not internal implementation details.
- Contract tests are prioritized at module boundaries where consumers integrate with core CLI/config, adapters, and summary artifacts.
- Determinism tests assert stable output and log/summarization ordering for identical inputs.
- Safety tests cover workspace-boundary enforcement, output-collision rejection, and unknown-project targeting failures.
- Execution tests cover sequential and parallel modes, including all-settled aggregate failure handling.
- Adapter tests verify capability resolution, fallback behavior, and warnings when SSR paths are unavailable.
- Stencil parity tests verify migrated behavior against established expectations from prior validated workflows.
- Lit POC tests remain intentionally narrow and focus on one happy-path SSR integration.
- Summary tests validate schema version, timing fields, per-project statuses, duration recording, generated index references, and sorted unique error codes.
- Exit-code tests assert non-zero behavior for any failed project and dedicated non-zero behavior for zero executed projects.
- CI policy tests assert drift failure behavior and required compatibility matrix update behavior for applicable breaking releases.
- Documentation quality checks verify publishable packages expose concise install/quickstart/support guidance.

Modules targeted for automated tests:

- Core Configuration and Validation Engine
- Core Planning and Execution Orchestrator
- Core Output Writer
- Adapter Capability Contract and adapter-specific implementations
- Summary and Error Reporting Module
- CI Drift and Compatibility Gate Module

Prior art for tests:

- Existing integration behavior from the prior qwik-stenciljs repository serves as baseline behavioral reference for parity-oriented tests.
- Monorepo package-level test conventions should align across core and adapters to keep assertions contract-focused and reusable.

## Out of Scope

- FAST adapter implementation in v1.
- Shoelace-specific adapter implementation in v1.
- Watch mode for generation in v1.
- Local generation cache or skip mode in v1.
- Full-production Lit SSR coverage beyond a constrained happy-path POC in v1.
- Mandatory RFC process during early 0.x stage.
- Backport support policy during 0.x.

## Further Notes

- This PRD is derived from locked migration decisions and intended to be implementation-facing while preserving flexibility in exact file layout and code structure.
- During migration, both old and new repositories should remain open in the same workspace to allow direct behavioral cross-checks.
- Cutover to the new monorepo should happen only after stencil parity, lit SSR POC proof, and CEM compatibility gates all pass.
- If published as a GitHub issue, this PRD should be used as the parent for tracer-bullet implementation issues created in dependency order.

## References

- Decisions source document: .docs/qwik-custom-elements-decisions.md
