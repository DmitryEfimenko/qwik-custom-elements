import { expect, test } from '@playwright/test';

test('lit ssr bridge interaction contract: toggles handler and increments active counters', async ({
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
      customElements.get('de-button') != null &&
      customElements.get('de-alert') != null,
  );

  const firstHost = page.locator('#first-lit-wrapper de-button');
  const secondHost = page.locator('#second-lit-wrapper de-button');
  await expect(firstHost).toBeVisible();
  await expect(secondHost).toBeVisible();

  const firstButton = page.locator('#first-lit-wrapper de-button button');
  const secondButton = page.locator('#second-lit-wrapper de-button button');
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

  await expect(
    page.locator('#first-lit-wrapper de-button[size="lg"]'),
  ).toBeVisible();
  await expect(
    page.locator('#second-lit-wrapper de-button[size="lg"]'),
  ).toBeVisible();

  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Validation Alert',
  );
  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Alert body content',
  );
  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Alert footer content',
  );

  await expect(page.locator('#first-lit-button')).toHaveCount(0);
});

test('lit csr bridge interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await page.goto('/lit/csr/bridge');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Lit CSR Bridge Validation' }),
  ).toBeVisible();

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
      customElements.get('de-button') != null &&
      customElements.get('de-alert') != null,
  );

  const firstHost = page.locator('#first-lit-wrapper de-button');
  const secondHost = page.locator('#second-lit-wrapper de-button');
  await expect(firstHost).toBeVisible();
  await expect(secondHost).toBeVisible();

  const firstButton = page.locator('#first-lit-wrapper de-button button');
  const secondButton = page.locator('#second-lit-wrapper de-button button');
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

  await expect(
    page.locator('#first-lit-wrapper de-button[size="lg"]'),
  ).toBeVisible();
  await expect(
    page.locator('#second-lit-wrapper de-button[size="lg"]'),
  ).toBeVisible();

  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Validation Alert',
  );
  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Alert body content',
  );
  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Alert footer content',
  );
});

test('lit csr bridge regression: size toggles preserve mounted host instance and interaction', async ({
  page,
}) => {
  await page.goto('/lit/csr/bridge');

  await page.waitForFunction(() => customElements.get('de-button') != null);

  const firstHost = page.locator('#first-lit-wrapper de-button');
  const firstButton = page.locator('#first-lit-wrapper de-button button');

  await expect(firstHost).toBeVisible();
  await expect(firstButton).toBeVisible();

  await firstHost.evaluate((host) => {
    (globalThis as Record<string, unknown>).__qce_first_lit_host__ = host;
  });

  for (let i = 0; i < 3; i += 1) {
    await page.locator('#toggle-size').click();
  }

  await expect(page.locator('#button-size')).toContainText('Button size: lg');
  await expect(firstButton).toBeVisible();

  const hostInstanceWasPreserved = await firstHost.evaluate((host) => {
    return (
      (globalThis as Record<string, unknown>).__qce_first_lit_host__ === host
    );
  });

  // RED guard: prop updates must not remount CSR host element.
  expect(hostInstanceWasPreserved).toBe(true);

  await firstButton.click();
  await firstButton.click();
  await firstButton.click();
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 1',
  );
});
