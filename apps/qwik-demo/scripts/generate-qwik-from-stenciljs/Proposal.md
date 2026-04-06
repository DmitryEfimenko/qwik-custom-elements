# Title

First-Class Stencil Component Interop for Qwik: SSR Bridge and Typed Wrapper Generation

# What is it about?

Introduce official Qwik support for rendering Stencil custom elements with SSR plus an accompanying generator that emits typed Qwik wrappers from Stencil metadata.

# What's the motivation for this proposal?

## Problems we are trying to solve

- Integrating Stencil components into Qwik currently requires repetitive manual wrapper authoring per component.
- Manual wrappers drift over time from actual Stencil metadata for props, events, and slots.
- Event wiring and named slot projection are easy to get wrong in SSR and resumable hydration scenarios.
- Teams lack a standard, deterministic, safe generation workflow for Stencil to Qwik interop.

## Goals we are trying to achieve

- Provide a reliable runtime bridge for SSR, hydration, prop sync, and event handling for Stencil custom elements.
- Provide a generator that creates one typed Qwik wrapper per Stencil component with no manual work.
- Preserve graceful behavior when metadata is partial: runtime still works even if some typing must degrade.
- Make output deterministic and safe for CI and repeated local runs.

## Additional context

- The runtime bridge behavior is already validated through the existing `createStencilSSRComponent` implementation and its `StencilSSRProps` event and slot contract.
- The generator pipeline already exists and supports multiple metadata inputs through provider fallback and normalization. See POC: https://github.com/DmitryEfimenko/qwik-stenciljs

# Proposed Solution / Feature

## What do we propose?

### 1) Runtime Layer: first-class Stencil SSR bridge API

Add an official runtime API in Qwik for SSR-capable Stencil interop, based on a component factory pattern that accepts:

- Stencil tag name
- Props bag
- Event map from Stencil event name to QRL callback
- Named slots metadata

The runtime should include:

- Server rendering via Stencil `renderToString`
- Stable slot marker projection for default and named slots
- Client-side prop synchronization to the custom element
- Client event listener wiring using the events map, with proper cleanup on rerender/unmount
- SSR style dedupe and client setup support for style relocation + custom element definition

### 2) Tooling Layer: official wrapper generator

Add official tooling to generate typed wrappers from built Stencil output:

- Source resolution from either local path or package name
- Metadata source chain: Custom Elements Manifest, then docs-json, then dist fallback
- Slot fallback discovery when docs metadata is incomplete
- Provider-agnostic normalization into one internal model
- Emission of one typed wrapper per component plus shared runtime bootstrap
- Safe bounded output cleanup and deterministic writes
- Generation manifest output for diagnostics and reproducibility

## Code examples

### Example: app-level usage with generated wrappers

```tsx
import { component$ } from '@builder.io/qwik';
import {
  DeAlert,
  DeButton,
  useGeneratedStencilClientSetup,
} from '~/components/generated/stencil';

export default component$(() => {
  useGeneratedStencilClientSetup();

  return (
    <>
      <DeButton size="md">Click me</DeButton>
      
      <DeAlert>
        Message body

        <span q:slot="footer">
          <DeButton size="md">Click me</DeButton>
        </span>
      </DeAlert> 
    </>
  );
});
```

### Example: generated wrapper event mapping shape

```tsx
const events: Record<string, QRL<(...args: any[]) => void>> = {};
if (props.onTripleClick$) {
  events['tripleClick'] = props.onTripleClick$;
}

return (
  <GeneratedStencilComponent
    tagName="de-button"
    props={elementProps}
    events={Object.keys(events).length ? events : undefined}
    slots={undefined}
  >
    <Slot />
  </GeneratedStencilComponent>
);
```

### Example: fallback behavior when metadata is incomplete

- If event metadata is unavailable, wrappers still compile and run via passthrough compatibility.
- If slot metadata is unavailable, fallback discovery infers default and named slots from compiled output.
- Generation manifest records provider and provenance for troubleshooting.

# Non-goals (initial scope)

- Watch mode.
- Auto-running Stencil builds as part of generation.
- Full AST-based recovery of events and methods when upstream metadata is missing.
- Special support for unusual package export layouts without a concrete package requirement.

# Rollout / Adoption Plan

1. Ship as an experimental interop feature with documentation and examples.
2. Validate on both local path and package-name source workflows.
3. Stabilize API naming and ergonomics based on feedback.
4. Promote to recommended interop path after SSR and hydration behavior is proven across representative Stencil libraries.

# Links / References

- Existing runtime bridge implementation:
  - [stencil-ssr.tsx](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/src/components/stencil-js-qwik-ssr/stencil-ssr.tsx)
  - [model.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/src/components/stencil-js-qwik-ssr/model.ts)
  - [client-setup.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/src/components/stencil-js-qwik-ssr/client-setup.ts)
- Existing generator implementation:
  - [index.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/index.ts)
  - [generator.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/generator.ts)
  - [providers/index.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/providers/index.ts)
  - [normalization/index.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/normalization/index.ts)
  - [output/index.ts](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/output/index.ts)
- Prior implementation and verification notes:
  - [plan.md](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/plan.md)
  - [research.md](https://github.com/DmitryEfimenko/qwik-stenciljs/blob/main/qwik-app/scripts/generate-qwik-from-stenciljs/research.md)
