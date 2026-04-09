---
name: qwik-best-practices
description: 'Build and refactor Qwik + Qwik City code using Qwik-native primitives correctly (signals/stores, $, QRLs, tasks, loaders/actions, server$). Use when: writing components, event handlers, state, data loading/mutations, routing, validators, endpoints, middleware, caching, or fixing resumability/perf issues.'
argument-hint: 'Describe what you are building (component/route/loader/action), where it lives, and any constraints (SSR/CSR, data source, validation, caching).'
---

# Qwik Best Practices

Make Qwik code that stays resumable, serializable, and lazy by default.

## When to Use

- Creating/refactoring Qwik components (state, events, context, slots, rendering, styling)
- Adding Qwik City routes (pages/layouts), `routeLoader$`, `routeAction$`, validators, endpoints, middleware
- Implementing server-only code via `server$` or Qwik City endpoints
- Debugging performance/resumability issues (unexpected eager JS, broken serialization, wrong task usage)

## Inputs to Ask For (if missing)

1. **Where is the change?** (app/package + file path)
2. **Is it route-level or component-level?** (Qwik City vs plain component)
3. **When should it run?** SSR, client-on-visible, on-interaction, or on-navigation
4. **Data flow**: read-only fetch vs mutation; caching rules; validation requirements

## Procedure

### 1) Classify the work (decision point)

Pick the smallest correct primitive:

- **UI only / local state** → `useSignal()` or `useStore()`
- **Side effects / derived work** → `useTask$()` (reacts to tracked signals/stores)
- **Client-only effects** (DOM APIs, `window`, `document`, observers) → `useVisibleTask$()`
- **Async data tied to component** → `useResource$()` (and render via `<Resource />`)
- **Route data for SSR + navigation** → `routeLoader$()`
- **Route mutation (forms, POST)** → `routeAction$()` + validators
- **Server-only callable from client** → `server$()` (or prefer endpoints/actions when route-scoped)

### 2) Keep code serializable and lazy (core rule)

- Anything captured by a QRL (event handlers, tasks, server$ closures) must be **serializable**.
- Avoid capturing: class instances, non-POJOs, DOM nodes, functions, big objects, or non-deterministic singletons.
- Prefer passing **IDs / plain data** and re-hydrating on the server when needed.

### 3) Events: always use Qwik’s `$` patterns

- Event handlers should be QRLs (typically using the `$` suffix helper pattern).
- Don’t inline heavy logic in event handlers; split into small QRL-safe helpers.
- If logic must be server-side, call `server$()` or a `routeAction$()`.

### 4) State: choose `useSignal` vs `useStore` deliberately

- `useSignal<T>(initial)` for single values and simple primitives.
- `useStore()` for object graphs; keep it plain and stable.
- Prefer explicit updates; avoid patterns that create new object graphs every render.

### 5) Data loading (component vs route)

**Route-level (Qwik City):**

- Use `routeLoader$()` for data needed to render the page on navigation.
- Add caching headers via Qwik City caching utilities when appropriate.

**Component-level:**

- Use `useResource$()` for async work bound to a component’s lifecycle.
- Ensure the resource function only reads tracked state you intend to re-run on.

### 6) Mutations + forms

- Prefer `routeAction$()` for form submissions; validate inputs with Qwik City validators.
- Return structured results for UI (success flag, field errors) and render them declaratively.
- For complex multi-step forms, keep validation server-side; avoid leaking secrets to the client.

### 7) Server boundaries

- Use `server$()` for server-only computation invoked from the client; keep inputs/outputs serializable.
- Prefer endpoints/actions for route-scoped behavior (clearer HTTP semantics, caching, and validation).

### 8) Routing + file conventions (Qwik City)

- Use pages/layouts under `src/routes/`.
- Prefer `routeLoader$` for SSR data, and keep route modules focused (loader/action + UI).
- If you need to share loader logic, use the documented re-exporting pattern.

## Quality Checklist (done criteria)

- Uses the correct primitive for timing (SSR vs visible vs interaction)
- No non-serializable values captured in QRLs, tasks, loaders/actions, or `server$`
- Data fetching is route-scoped (`routeLoader$`) when it affects initial render
- Mutations use `routeAction$` + validators (instead of ad-hoc fetch) when route-scoped
- Client-only APIs appear only inside `useVisibleTask$` (or guarded appropriately)
- Avoids unnecessary eager imports; keeps heavy code behind QRL boundaries

## References

- Docs menu and official topic map: [Qwik docs menu](references/qwik-docs-menu.md)
