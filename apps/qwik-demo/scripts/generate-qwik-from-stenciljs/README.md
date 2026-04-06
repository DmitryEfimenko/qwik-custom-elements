# Stencil-to-Qwik Generator

This generator reads a built Stencil library and emits typed Qwik wrappers that reuse the shared SSR bridge in this app.

## Quick Start

1. Build the Stencil library first.
2. From `qwik-app`, run:

```bash
npm run generate:stencil-wrappers
```

The script runs:

```bash
tsx scripts/generate-qwik-from-stenciljs/index.ts
```

By default, config is loaded from `scripts/generate-qwik-from-stenciljs/generator.config.json`.

## Configuration

Default config file example:

```json
{
  "outDir": "src/components/generated/stencil",
  "importMode": "demo",
  "stencilPath": "../stencil-js-lib",
  "cleanOutput": true
}
```

Config fields:

- `outDir` (string, required): Output directory (must remain a safe subdirectory of `qwik-app`).
- `importMode` (`demo` or `package`, required): Runtime import strategy.
- `stencilPath` (string, optional): Relative or absolute path to a local Stencil package root.
- `packageName` (string, optional): Installed package name to resolve from `qwik-app`.
- `cleanOutput` (boolean, required): Remove `outDir` before writing.
- `runtimeImports` (object, optional): Runtime import overrides.
  - `demoDefineCustomElements`
  - `demoRenderToString`
  - `packageLoader`
  - `packageHydrate`

Exactly one source must be configured:

- `stencilPath`
- `packageName`

## CLI Overrides

Supported flags:

- `--config=<path>`
- `--outDir=<path>`
- `--importMode=demo|package`
- `--stencilPath=<path>`
- `--packageName=<name>`
- `--cleanOutput` / `--no-cleanOutput`

Examples:

```bash
tsx scripts/generate-qwik-from-stenciljs/index.ts --stencilPath=../stencil-js-lib
```

```bash
tsx scripts/generate-qwik-from-stenciljs/index.ts --importMode=package --packageName=stencil-js-lib
```

## Import Modes

`demo` mode:

- Uses app-local runtime bridge imports (defaults to `src/components/stencil-js-utils.ts`).
- Useful in this repo where runtime assets are synced into `public/stencil-runtime`.

`package` mode:

- Uses package runtime entries:
  - `<packageName>/loader`
  - `<packageName>/hydrate`
- Or explicit `runtimeImports.packageLoader` and `runtimeImports.packageHydrate`.

## Required Stencil Build Artifacts

The generator validates these before writing output:

- `dist/collection/collection-manifest.json`
- `dist/types/components.d.ts`

If either file is missing, build the Stencil library first.

## Generated Output

Typical files in `outDir`:

- `runtime.generated.ts`
- One wrapper per component (for example, `DeAlert.tsx`)
- `index.ts` barrel exports
- `generation-manifest.json`

## Troubleshooting

### Missing config file

Error pattern:

- `Invalid generator config: Missing config file ...`

Fix:

- Create `scripts/generate-qwik-from-stenciljs/generator.config.json`, or
- Pass `--config=<path>`.

### Invalid source configuration

Error pattern:

- `Provide one source: set either stencilPath or packageName.`
- `stencilPath and packageName are mutually exclusive ...`

Fix:

- Configure exactly one source.

### Package resolution failure

Error pattern:

- `Unable to resolve packageName ... Install or link the package, or use stencilPath instead.`

Fix:

- Install/link the package, or switch to `stencilPath`.

### Missing Stencil artifacts

Error pattern:

- `Missing required artifact dist/collection/collection-manifest.json ...`
- `Missing required artifact dist/types/components.d.ts ...`

Fix:

- Build the Stencil package and confirm those files exist.

### Unsafe output directory

Error pattern:

- `Refusing to clean output directory ...`

Fix:

- Set `outDir` to a normal subdirectory inside `qwik-app`.
