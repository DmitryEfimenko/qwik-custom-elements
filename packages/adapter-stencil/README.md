# @qwik-custom-elements/adapter-stencil

Qwik runtime helpers for integrating Stencil custom elements.

## Ownership Boundary

`@qwik-custom-elements/adapter-stencil` owns Stencil-specific generation behavior and runtime integration.

That ownership includes:

- Stencil capability metadata
- Stencil runtime import resolution and validation
- Stencil SSR probing and SSR bridge behavior
- adapter-owned generated barrels, runtime helper modules, wrapper modules, and file extensions
- framework-specific output shape decisions that must not live in core

Core may orchestrate the run and pass typed parsed component metadata into this adapter, but core should not branch on adapter identity to shape Stencil-generated output directly.

## Current Exports

This package exposes two runtime entrypoints:

- `@qwik-custom-elements/adapter-stencil/client`
  - `createStencilClientSetup(...)`
  - `createStencilCSRComponent()`
- `@qwik-custom-elements/adapter-stencil/ssr`
  - `createStencilSSRComponent(...)`
  - SSR model and style helpers

These APIs let an app or generated wrapper layer bootstrap Stencil custom elements on the client and render them through a Qwik SSR bridge when hydrate-backed SSR is available.

`createStencilCSRComponent` provides the client-only rendering bridge for loader-only generation. It renders the custom element tag directly, wires events on the client, projects slots, and does not depend on Stencil server rendering.

## Manual Runtime Usage

```tsx
import { $ } from '@builder.io/qwik';
import { createStencilClientSetup } from '@qwik-custom-elements/adapter-stencil/client';
import {
  createStencilSSRComponent,
  type StencilRenderToString,
} from '@qwik-custom-elements/adapter-stencil/ssr';

import { defineCustomElements } from '@acme/stencil-lib/loader';

const renderToString: StencilRenderToString = async (input, options) => {
  const hydrateModuleId = '@acme/stencil-lib/hydrate';
  const { renderToString } = await import(/* @vite-ignore */ hydrateModuleId);
  return renderToString(input, options);
};

export const useAcmeClientSetup = createStencilClientSetup(
  $(async () => {
    await Promise.resolve(defineCustomElements());
  }),
);

export const AcmeStencilComponent = createStencilSSRComponent(
  $(renderToString),
);
```

## Source Types For Generation

The generator contract supports two source types for Stencil projects:

- `PACKAGE_NAME`
- `CEM`

The intended direction is that both source types can generate the same consumer-facing output shape when enough runtime information is available:

- a shared Stencil bridge/runtime module
- individual typed Qwik wrappers for each Stencil component

The difference between the two source types is input contract and discovery model, not desired output.

## `PACKAGE_NAME`

Use `PACKAGE_NAME` when the Stencil library is consumable as a package and you want package-aware discovery.

Example config:

```json
{
  "projects": [
    {
      "id": "demo",
      "adapter": "stencil",
      "adapterPackage": "@qwik-custom-elements/adapter-stencil",
      "source": {
        "type": "PACKAGE_NAME",
        "packageName": "@acme/stencil-lib"
      },
      "outDir": "./apps/qwik-demo/src/generated/acme",
      "cleanOutput": true,
      "adapterOptions": {
        "runtime": {
          "loaderImport": "@acme/stencil-lib/loader",
          "hydrateImport": "@acme/stencil-lib/hydrate"
        }
      }
    }
  ]
}
```

Example config with an explicit manifest override:

```json
{
  "projects": [
    {
      "id": "demo",
      "adapter": "stencil",
      "adapterPackage": "@qwik-custom-elements/adapter-stencil",
      "source": {
        "type": "PACKAGE_NAME",
        "packageName": "@acme/stencil-lib",
        "cemPath": "dist/custom-elements.json"
      },
      "outDir": "./apps/qwik-demo/src/generated/acme",
      "cleanOutput": true,
      "adapterOptions": {
        "runtime": {
          "loaderImport": "@acme/stencil-lib/loader",
          "hydrateImport": "@acme/stencil-lib/hydrate"
        }
      }
    }
  ]
}
```

Why use `PACKAGE_NAME`:

- Best fit when the library is installed and consumed like a normal package.
- Lets the generator resolve the package root and discover the manifest automatically.
- Keeps config closer to the way end users actually import the library.
- Works well when package exports are the source of truth for runtime entrypoints.

## `CEM`

Use `CEM` when you want explicit control over the manifest and runtime import locations.

Example config:

```json
{
  "projects": [
    {
      "id": "demo",
      "adapter": "stencil",
      "adapterPackage": "@qwik-custom-elements/adapter-stencil",
      "source": {
        "type": "CEM",
        "path": "./vendor/acme/custom-elements.json"
      },
      "outDir": "./apps/qwik-demo/src/generated/acme",
      "cleanOutput": true,
      "adapterOptions": {
        "runtime": {
          "loaderImport": "@acme/stencil-lib/loader",
          "hydrateImport": "@acme/stencil-lib/hydrate"
        }
      }
    }
  ]
}
```

Example config where runtime imports point at a project-local shim:

```json
{
  "projects": [
    {
      "id": "demo",
      "adapter": "stencil",
      "adapterPackage": "@qwik-custom-elements/adapter-stencil",
      "source": {
        "type": "CEM",
        "path": "./artifacts/acme/custom-elements.json"
      },
      "outDir": "./apps/qwik-demo/src/generated/acme",
      "cleanOutput": true,
      "adapterOptions": {
        "runtime": {
          "loaderImport": "./src/runtime/acme-loader",
          "hydrateImport": "./src/runtime/acme-hydrate"
        }
      }
    }
  ]
}
```

Why use `CEM`:

- The Stencil library is not installed as a normal package.
- You want generation decoupled from package resolution.
- You need to point at a specific manifest artifact rather than rely on package discovery.
- Runtime imports come from a shim, wrapper, vendored output, or nonstandard location.
- You want explicit, reproducible control over both metadata and runtime entrypoints.

## Planned Runtime Discovery Rules

For Stencil generation, the runtime can use two imports in addition to component metadata:

- a loader import used on the client (`defineCustomElements`)
- a hydrate import used for SSR (`renderToString`)

The current contract is:

- `PACKAGE_NAME` resolves runtime imports to `<packageName>/loader` and `<packageName>/hydrate` by default.
- For `PACKAGE_NAME`, explicit `adapterOptions.runtime.loaderImport` and `adapterOptions.runtime.hydrateImport` overrides take precedence over those defaults. When an override is set, it must be a non-empty string.
- For `PACKAGE_NAME`, the resolved loader import must be package-resolvable before generation proceeds. Loader resolution failures stop the run with a deterministic loader-specific error.
- For `PACKAGE_NAME`, the resolved hydrate import is validated when provided or inferred. Hydrate resolution failures downgrade SSR availability and emit a hydrate-specific diagnostic instead of aborting loader-only generation.
- `CEM` requires `adapterOptions.runtime.loaderImport`.
- `CEM` may omit `adapterOptions.runtime.hydrateImport` when SSR hydrate support is unavailable or intentionally deferred.
- Core consumes the adapter-resolved runtime imports when invoking adapter SSR probing, so runtime resolution and SSR capability checks use the same resolved inputs.

This keeps `PACKAGE_NAME` ergonomic while preserving `CEM` as an explicit-control mode for advanced or nonstandard setups.

## Generated Runtime Modules

For Stencil projects with a valid resolved loader import, generated client bootstrap remains valuable even when hydrate-backed SSR is unavailable.

The generated client module (`runtime-csr.generated.ts`) provides:

- a resolved `defineCustomElements` wrapper bound to the package-aware loader import
- `defineCustomElementsQrl`
- `useGeneratedStencilClientSetup`
- `GeneratedStencilCSRComponent` — the client-only rendering bridge created by `createStencilCSRComponent()`

When a resolved hydrate import is also available, generation additionally emits `runtime-ssr.generated.ts` with a typed `renderToString` export that loads the resolved hydrate runtime through the same Vite-ignored dynamic import boundary used for SSR-safe demo integration.

For `PACKAGE_NAME`, those runtime imports may come from package-aware defaults or explicit overrides. For `CEM`, they come from the explicit `adapterOptions.runtime` contract. This keeps generated runtime modules aligned with the same resolved runtime import contract already used for validation and SSR probing.

The generated runtime exposes two capability-specific consumer surfaces when runtime modes differ materially:

- a CSR surface for loader-only generation that boots the client runtime and backs wrappers with `createStencilCSRComponent`
- an SSR surface for hydrate-capable generation that includes the hydrate bridge and backs wrappers with `createStencilSSRComponent`

The runtime leaf split is intentional:

- `runtime-csr.generated.ts` is client-reachable and must remain loader-only.
- `runtime-ssr.generated.ts` owns the hydrate-backed `renderToString` bridge and keeps hydrate loading behind a dynamic import boundary.

Generation mode depends on which resolved runtime imports are actually available, but the final Issue `#34` contract should not require loader-only wrappers to target the same bridge/runtime surface as SSR-capable wrappers:

- Full SSR mode: both loader and hydrate resolve, so generation emits an SSR-capable surface whose wrappers render through `createStencilSSRComponent`.
- Loader-only mode: loader resolves but hydrate does not, so generation still emits a client-capable surface, but that surface should be backed by `createStencilCSRComponent` rather than a degraded SSR bridge.

When hydrate resolution fails, the client runtime module is still generated from the loader import so loader-only fallback flows remain usable.

## Generated Wrapper Artifacts

When the generator has enough Stencil runtime information, `@qwik-custom-elements/adapter-stencil` owns the full generated surface under the target `outDir`.

For equivalent resolved runtime inputs, `PACKAGE_NAME` and `CEM` projects produce the same consumer-facing wrapper contract. CSR and SSR generation expose distinct surfaces when their runtime behavior diverges.

The generated surface uses a flat structure:

- `index.ts`
  - Barrel that re-exports each generated Qwik wrapper plus the shared runtime helpers.
- `runtime.ts`
  - Stable app-facing barrel that re-exports the generated client and SSR runtime leaves.
- `runtime-csr.generated.ts`
  - Client bootstrap module that wires `defineCustomElements` into Qwik-friendly helpers and exports `GeneratedStencilCSRComponent`.
- `runtime-ssr.generated.ts` (emitted only when hydrate is available)
  - SSR-only bridge helpers that keep hydrate loading behind a dynamic import boundary.
- `*.tsx`
  - One generated Qwik wrapper per discovered Stencil component.

The current behavior:

- loader-only generation emits a CSR surface backed by `createStencilCSRComponent` (no `runtime-ssr.generated.ts`, wrappers render through `GeneratedStencilCSRComponent`)
- SSR-capable generation additionally emits `runtime-ssr.generated.ts` and backs wrappers with `GeneratedStencilComponent` from the SSR surface
- exact surface paths are implementation detail
- wrappers in both modes preserve the same public interface for typed props, typed `onEvent$` bindings, and slot projection

Generated wrapper components follow a stable contract:

- Prop typing starts from available CEM attribute and member metadata.
- Custom events become typed `onEvent$` QRL props when event metadata is available.
- Wrapper components call `useGeneratedStencilClientSetup()` so client bootstrap stays centralized in generated runtime output.
- When SSR runtime is available, wrappers render through `GeneratedStencilComponent` from the SSR surface backed by `createStencilSSRComponent`.
- When only the loader runtime is available, wrappers render through `GeneratedStencilCSRComponent` from the CSR surface backed by `createStencilCSRComponent`, rendering the custom-element tag directly while preserving props, typed `onEvent$` bindings, slot metadata, and client bootstrap.
- Slot metadata is projected with deterministic Qwik `<Slot />` output, including named slot support when the source metadata declares it.

Example generated surface (SSR-capable mode):

```text
src/generated/
  index.ts
  runtime.ts
  runtime-csr.generated.ts
  runtime-ssr.generated.ts
  de-button.tsx
  de-alert.tsx
```

In loader-only mode, `runtime-ssr.generated.ts` is not emitted, and wrapper files render through `GeneratedStencilCSRComponent` instead of `GeneratedStencilComponent`.

Example consumer usage:

```tsx
import { $, component$ } from '@builder.io/qwik';

import { QwikDeAlert, QwikDeButton } from './generated';

export default component$(() => {
  const handleTripleClick$ = $(() => {
    console.log('triple click');
  });

  return (
    <>
      <QwikDeButton size="md" onTripleClick$={handleTripleClick$}>
        Generated Button
      </QwikDeButton>

      <QwikDeAlert heading="Generated Alert">
        <span>Default slot content</span>
        <span q:slot="footer">Named slot content</span>
      </QwikDeAlert>
    </>
  );
});
```

The checked-in demo route at `apps/qwik-demo/src/routes/stencil/ssr/wrappers/` is the reference integration path for this generated surface. It validates that generated wrappers, generated runtime setup, typed event handlers, and slot projection all work together without a handwritten app-local bridge layer.

The checked-in CSR demo routes at `apps/qwik-demo/src/routes/stencil/csr/` consume CSR-generated output directly rather than re-exporting or aliasing the SSR demo routes.

## SSR Fallback Behavior

Generation supports SSR where available but does not require SSR availability to produce useful wrappers.

The behavior for Stencil projects is:

- If both loader and hydrate are available, generation emits an SSR-capable surface with both `runtime-csr.generated.ts` and `runtime-ssr.generated.ts`, and wrappers render through `createStencilSSRComponent`.
- If only loader is available and hydrate/SSR support is unavailable, generation still emits a client-capable CSR surface backed by `createStencilCSRComponent`. The CSR surface omits `runtime-ssr.generated.ts` entirely.

Consumers can treat those two modes as separate capability-specific surfaces with the same wrapper-facing contract:

- Full SSR mode exposes an SSR-capable surface whose wrappers render through `createStencilSSRComponent`.
- Loader-only mode exposes a CSR surface whose wrappers render through `createStencilCSRComponent` and never depend on Stencil server rendering.
- In both modes, wrapper props, event bindings, slot projection, and client bootstrap stay adapter-owned and deterministic.

The loader-only fallback still provides value to consumers because generated Qwik components remain:

- typed
- consistent across components
- event-aware
- slot-aware
- ready for client-side Stencil upgrade

## Documentation Expectations

Consumer-facing behavior for source types, runtime discovery, SSR fallback, and generated output shape should be documented whenever changes land in this adapter or the core generator.

Architecture ownership changes should also keep this README aligned with the package-level boundary: Stencil-specific generated output belongs here, not in `@qwik-custom-elements/core`.
