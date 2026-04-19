# @qwik-custom-elements/adapter-stencil

Qwik runtime helpers for integrating Stencil custom elements.

## Current Exports

This package currently exposes two runtime entrypoints:

- `@qwik-custom-elements/adapter-stencil/client`
  - `createStencilClientSetup(...)`
- `@qwik-custom-elements/adapter-stencil/ssr`
  - `createStencilSSRComponent(...)`
  - SSR model and style helpers

These APIs let an app or generated wrapper layer bootstrap Stencil custom elements on the client and render them through a shared Qwik SSR bridge.

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

## Generated Client Bootstrap

For `PACKAGE_NAME` projects with a valid resolved loader import, generation now emits `runtime.generated.ts` alongside the component wrappers.

That generated module currently provides:

- a resolved `defineCustomElements` wrapper bound to the package-aware loader import
- `defineCustomElementsQrl`
- `useGeneratedStencilClientSetup`

This keeps the client bootstrap aligned with the same resolved runtime import contract already used for validation and SSR probing. When hydrate resolution fails, the client runtime module is still generated from the loader import so loader-only fallback flows remain usable.

## Planned SSR Fallback Behavior

Support SSR where available, but do not make SSR availability a prerequisite for generating useful wrappers.

The intended behavior for Stencil projects is:

- If both loader and hydrate are available, generate the shared bridge plus typed Qwik wrappers with SSR support.
- If only loader is available and hydrate/SSR support is unavailable, still generate the shared bridge plus typed Qwik wrappers.
- In the loader-only case, the bridge should degrade to a minimal proxy that renders the custom element tag and forwards props, events, and slot metadata without server-side Stencil rendering.

That fallback still provides value to consumers because generated Qwik components remain:

- typed
- consistent across components
- event-aware
- slot-aware
- ready for client-side Stencil upgrade

## Documentation Expectations

Consumer-facing behavior for source types, runtime discovery, SSR fallback, and generated output shape should be documented whenever changes land in this adapter or the core generator.
