import { expect, test } from '@playwright/test';

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

test('stencil events interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await page.goto('/stencil/ssr/bridge');

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

  // Verify a triple-click is required: first two clicks do not fire the custom event.
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
    page.locator('#first-stencil-wrapper de-button[size="lg"]'),
  ).toBeVisible();
  await expect(
    page.locator('#second-stencil-wrapper de-button[size="lg"]'),
  ).toBeVisible();
});
