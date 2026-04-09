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

test('stencil-events interaction contract: toggles handler and increments active counters', async ({
  page,
}) => {
  await page.goto('/stencil-events');

  await expect(page.locator('#active-handler')).toContainText(
    'Active handler: alpha',
  );
  await expect(page.locator('#first-alpha-count')).toContainText(
    'First alpha count: 0',
  );
  await expect(page.locator('#first-beta-count')).toContainText(
    'First beta count: 0',
  );

  await page.waitForFunction(() => customElements.get('de-button') != null);

  const firstHost = page.locator('#first-stencil-wrapper de-button');
  await expect(firstHost).toHaveClass(/hydrated/);

  const firstButton = page.locator('#first-stencil-wrapper de-button button');
  await expect(firstButton).toBeVisible();

  const clickTriple = async (locator: typeof firstButton) => {
    await locator.evaluate((el) => {
      const clickEvent = () =>
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });

      el.dispatchEvent(clickEvent());
      el.dispatchEvent(clickEvent());
      el.dispatchEvent(clickEvent());
    });
  };

  await clickTriple(firstButton);
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
});
