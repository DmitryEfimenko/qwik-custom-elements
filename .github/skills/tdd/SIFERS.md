# SIFERS Pattern

## Repository Pattern: SIFERS + setup(options)

Use this shape for test files in this repository when it adds real value.

- `setup(options?: SetupOptions)` should create and return meaningful fixtures, page objects, mocks, or rendered component state.
- `it(...)` blocks should consume only values returned by `setup(...)` when a setup helper is used.
- Avoid `beforeEach(...)` for building fixtures; each test should call `setup(...)` explicitly when it needs one.
- Use `afterEach(...)` only for cleanup, such as disposing resources and restoring mocks.

Use this rule of thumb:

- Pure function tests: usually no `setup(...)` unless fixture creation is genuinely repetitive or domain-specific.
- Component/integration tests: `setup(...)` should render the component, install mocks/stubs, and return page elements plus interaction helpers. When the test is DOM-driven, prefer a `PageElements` class over a loose group of `getX()` and `clickX()` functions.
- Do not add a pass-through `setup(...)` that simply renames a couple of literals or forwards options unchanged.

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

interface SetupOptions {
  initialValue?: number;
  showFooter?: boolean;
}

class PageElements {
  constructor(private root: HTMLElement) {}

  get heading() {
    return this.root.querySelector('h2');
  }

  get footer() {
    return this.root.querySelector('footer');
  }

  clickHeading() {
    this.heading?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
}

async function setup(options: SetupOptions = {}) {
  vi.clearAllMocks();

  // Create the unit/component under test and render it.
  const root = document.createElement('div');
  root.innerHTML = options.showFooter
    ? '<section><h2>Global Nav</h2><footer>footer</footer></section>'
    : '<section><h2>Global Nav</h2></section>';

  const elements = new PageElements(root);
  const mocks = {
    logger: vi.fn(),
  };

  return { root, elements, mocks };
}

describe('example feature', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading', async () => {
    const { elements } = await setup();
    expect(elements.heading).toBeTruthy();
  });

  it('renders footer when enabled', async () => {
    const { elements } = await setup({ showFooter: true });
    expect(elements.footer).toBeTruthy();
  });

  it('invokes page-object actions through PageElements', async () => {
    const { elements } = await setup();
    elements.clickHeading();
    expect(elements.heading).toBeTruthy();
  });
});
```

## SIFERS Mapping

- Setup: call `setup(options)` only when it creates meaningful fixtures.
- Invoke: run the method, event, or rendered interaction.
- Fake: mock only true boundaries.
- Expect: assert observable outcomes.
- Repeat: cover scenarios and edge cases.
- Shutdown: cleanup in `afterEach(...)`.

## Qwik + Vitest Notes

For Qwik component tests in Vitest, prefer `createDOM` from `@builder.io/qwik/testing` and test the rendered component through DOM output and user interactions.

- Render real Qwik components with `createDOM()`.
- Make sure Vitest is running with the Qwik plugin/optimizer pipeline; `createDOM()` does not replace that requirement.
- Prefer user-visible assertions (`screen`, DOM queries, click/keyboard interactions) over helper-only coverage when testing components.
- For non-trivial component tests, prefer `setup(options?)` returning `elements: new PageElements(...)`, where `PageElements` wraps selectors and user interactions around the rendered `screen`.
- In this repo's `createDOM()` harness, prefer selector/tag/attribute/text assertions over `instanceof HTMLElement`-style checks unless the test environment explicitly provides those globals.
- If the repo only includes `*.test.ts`, avoid fake pass-through wrappers just to mimic `.tsx` examples. Use a meaningful host component/harness or direct `jsx(...)` rendering instead.
- Do not force a flaky or half-configured component harness into a feature test just to satisfy a pattern. If the Qwik/Vitest harness is not reliable yet for that component shape, keep the feature test at the highest stable public boundary and create a dedicated harness task.

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```
