import { expect, test } from '@playwright/test';

async function assertStencilInteractionRoute(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  routePath: string,
  expectedHeading: string,
  options: {
    expectedSizeAttribute?: 'present' | 'absent' | 'ignore';
  } = {},
) {
  await page.goto(routePath);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    expectedHeading,
  );

  await expect(page.locator('#active-handler')).toContainText(
    'Active handler: alpha',
  );
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 0',
  );
  await expect(page.locator('#first-beta-count')).toContainText(
    'First beta count: 0',
  );

  await page.waitForFunction(
    () =>
      (globalThis as Record<string, unknown>)[
        '__qce_stencil_client_setup_done__'
      ] === true,
  );

  await page.waitForFunction(() => customElements.get('de-button') != null);

  const firstHost = page.locator('#first-stencil-wrapper de-button');
  const secondHost = page.locator('#second-stencil-wrapper de-button');
  await expect(firstHost).toHaveClass(/hydrated/);
  await expect(secondHost).toHaveClass(/hydrated/);

  const firstButton = page.locator('#first-stencil-wrapper de-button button');
  const secondButton = page.locator('#second-stencil-wrapper de-button button');
  await expect(firstButton).toBeVisible();
  await expect(secondButton).toBeVisible();

  const clickTriple = async (locator: typeof firstButton) => {
    await locator.click();
    await locator.click();
    await locator.click();
  };

  await firstButton.click();
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 0',
  );
  await page.waitForTimeout(700);
  await firstButton.click();
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 0',
  );
  await page.waitForTimeout(700);
  await firstButton.click();
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 1',
  );
  await expect(page.locator('#first-beta-count')).toContainText(
    'First beta count: 0',
  );

  await page.locator('#toggle-handler').click();
  await expect(page.locator('#active-handler')).toContainText(
    'Active handler: beta',
  );

  await clickTriple(firstButton);
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 1',
  );
  await expect(page.locator('#first-beta-count')).toContainText(
    'First beta count: 1',
  );

  await clickTriple(secondButton);
  await expect(page.locator('#second-count')).toContainText('Second count: 1');

  await page.locator('#toggle-size').click();
  await expect(page.locator('#button-size')).toContainText('Button size: lg');

  const expectedSizeAttribute = options.expectedSizeAttribute ?? 'present';

  if (expectedSizeAttribute === 'present') {
    await expect(
      page.locator('#first-stencil-wrapper de-button[size="lg"]'),
    ).toBeVisible();
    await expect(
      page.locator('#second-stencil-wrapper de-button[size="lg"]'),
    ).toBeVisible();
  } else if (expectedSizeAttribute === 'absent') {
    await expect(
      page.locator('#first-stencil-wrapper de-button[size="lg"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('#second-stencil-wrapper de-button[size="lg"]'),
    ).toHaveCount(0);
  }
}

test('home route renders baseline content', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Qwik Demo',
    }),
  ).toBeVisible();
  await expect(
    page.getByText('This app is running with a minimal baseline page.'),
  ).toBeVisible();
});

test('stencil bridge interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await assertStencilInteractionRoute(
    page,
    '/stencil/ssr/bridge',
    'Stencil Events Validation',
  );
});

test('stencil wrappers interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await assertStencilInteractionRoute(
    page,
    '/stencil/ssr/wrappers',
    'Stencil Wrappers Validation',
  );
});

test('stencil csr bridge interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await assertStencilInteractionRoute(
    page,
    '/stencil/csr/bridge',
    'Stencil CSR Events Validation',
    { expectedSizeAttribute: 'absent' },
  );
});

test('stencil csr bridge regression: size toggles preserve mounted host instance and interaction', async ({
  page,
}) => {
  await page.goto('/stencil/csr/bridge');

  await page.waitForFunction(
    () => customElements.get('de-button') != null,
  );

  const firstHost = page.locator('#first-stencil-wrapper de-button');
  const firstButton = page.locator('#first-stencil-wrapper de-button button');

  await expect(firstHost).toHaveClass(/hydrated/);
  await expect(firstButton).toBeVisible();

  await firstHost.evaluate((host) => {
    (globalThis as Record<string, unknown>).__qce_first_stencil_host__ = host;
  });

  for (let i = 0; i < 3; i += 1) {
    await page.locator('#toggle-size').click();
  }

  await expect(page.locator('#button-size')).toContainText('Button size: lg');
  await expect(firstButton).toBeVisible();

  const hostInstanceWasPreserved = await firstHost.evaluate((host) => {
    return (
      (globalThis as Record<string, unknown>).__qce_first_stencil_host__ ===
      host
    );
  });

  // RED guard for issue #37: prop updates must not remount CSR host element.
  expect(hostInstanceWasPreserved).toBe(true);

  await firstButton.click();
  await firstButton.click();
  await firstButton.click();
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 1',
  );
});

test('stencil csr wrappers interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await assertStencilInteractionRoute(
    page,
    '/stencil/csr/wrappers',
    'Stencil CSR Wrappers Validation',
    { expectedSizeAttribute: 'ignore' },
  );
});

test('lit ssr bridge smoke: first Lit render path renders and custom element is available', async ({
  page,
}) => {
  await page.goto('/lit/ssr/bridge');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Lit SSR Bridge Validation',
    }),
  ).toBeVisible();
  await expect(page.locator('#lit-render-status')).toContainText(
    'First Lit render path active.',
  );

  await page.waitForFunction(() => customElements.get('de-button') != null);

  const firstHost = page.locator('#lit-first-wrapper de-button');
  await expect(firstHost).toBeVisible();
});
