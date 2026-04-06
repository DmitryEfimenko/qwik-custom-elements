---
description: 'Use when working in this Turborepo monorepo, especially for package scripts, command selection, and CI/local validation loops. Covers canonical root scripts, Turbo-first execution, and safe script deduping.'
name: 'Turborepo Workflow Conventions'
---

# Turborepo Workflow Conventions

## Command selection order

- Use root scripts first for repo-wide workflows:
  - `npm run build`
  - `npm run typecheck`
  - `npm run test`
  - `npm run lint`
  - `npm run format`
- Root scripts should delegate to Turbo tasks (`turbo run ...`).
- For package-focused debugging, prefer `pnpm --filter <package> run <script>`.
- Use `pnpm -r --if-present run <script>` only as a temporary fallback when script coverage is incomplete.

## Script naming conventions

- Keep script names consistent across workspace packages:
  - `build`
  - `check-types`
  - `test`
  - `lint`
  - `format`
  - `dev`
- If a package does not implement a task yet, provide an explicit no-op script with a clear message (do not omit the script).
- Avoid duplicate aliases for the same action (for example, do not keep both `build.types` and `check-types`, or both `fmt` and `format`).

## Dedupe and migration safety

- Before removing legacy script aliases, search the workspace for usages and update call sites.
- Update docs/prompts/examples that mention removed script names.
- Treat generated logs (for example `.turbo` artifacts) as non-source references unless intentionally versioned.

## Typecheck reliability guardrails

- If a package runs `tsc` in scripts, ensure `typescript` is available in that package execution context.
- If test or tooling typings require Node globals, include `node` in the package TypeScript `types` list.

## Validation expectations

- After script or task changes, run:
  - root `typecheck`
  - root `test`
  - root `lint`
  - root `format`
  - root `build`
- If a command fails, prefer fixing package script coverage or task mapping over adding one-off command exceptions.
