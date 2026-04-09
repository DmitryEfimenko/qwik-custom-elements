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
