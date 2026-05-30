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
  await expect(firstHost).toHaveCount(1);
  await expect(secondHost).toHaveCount(1);
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);

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
  await expect(page.locator('#lit-alert-wrapper .de-alert')).toHaveCount(1);
  await expect(page.locator('#lit-alert-wrapper > span')).toHaveCount(0);

  // Named slot content must carry native slot= attr so shadow DOM distributes
  // it to <slot name="footer"> — q:slot alone is ignored by shadow DOM.
  await expect(
    page.locator('#lit-alert-wrapper de-alert [slot="footer"]'),
  ).toContainText('Alert footer content');

  await expect(page.locator('#first-lit-button')).toHaveCount(0);
});

test('lit ssr bridge: shadow DOM is not double-rendered after hydration', async ({
  page,
}) => {
  // Intercept the de-alert custom element definition and capture the shadow DOM
  // count immediately after Lit's first async performUpdate() microtask runs.
  // Two Promise hops place us after Lit's own queued update
  // (Lit schedules performUpdate via Promise.resolve().then()).
  // If @lit-labs/ssr-client/lit-element-hydrate-support.js was NOT loaded
  // before define(), Lit appends a fresh render to the DSD shadow root and the
  // count becomes 2. The fix ensures hydrate-support is always loaded first.
  await page.addInitScript(() => {
    (window as any).__deAlertShadowCountAfterFirstUpdate = -1;
    const originalDefine = customElements.define.bind(customElements);
    Object.defineProperty(customElements, 'define', {
      value(
        name: string,
        ctor: CustomElementConstructor,
        opts?: ElementDefinitionOptions,
      ) {
        const result = originalDefine(name, ctor, opts);
        if (name === 'de-alert') {
          Promise.resolve().then(() =>
            Promise.resolve().then(() => {
              const el = document.querySelector(
                '#lit-alert-wrapper de-alert',
              ) as HTMLElement | null;
              (window as any).__deAlertShadowCountAfterFirstUpdate =
                el?.shadowRoot?.querySelectorAll('.de-alert').length ?? -1;
            }),
          );
        }
        return result;
      },
      writable: true,
      configurable: true,
    });
  });

  await page.goto('/lit/ssr/bridge');

  // Wait for the de-alert shadow count to be captured.
  await page.waitForFunction(
    () => (window as any).__deAlertShadowCountAfterFirstUpdate !== -1,
  );

  const count = await page.evaluate(
    () => (window as any).__deAlertShadowCountAfterFirstUpdate,
  );

  // Exactly 1 means hydrate-support ran before the element was defined and
  // Lit hydrated the DSD shadow root rather than appending a duplicate render.
  expect(count).toBe(1);
});

test('lit ssr bridge: light DOM slot content is not duplicated after signal change', async ({
  page,
}) => {
  await page.goto('/lit/ssr/bridge');

  await page.waitForFunction(
    () =>
      customElements.get('de-button') != null &&
      customElements.get('de-alert') != null,
  );

  // Trigger a signal change to force Qwik to re-render the route component.
  await page.locator('#toggle-size').click();
  await expect(page.locator('#button-size')).toContainText('Button size: lg');

  // After re-render: the alert wrapper must contain exactly one de-alert element.
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);

  // Slot content must be INSIDE <de-alert> — not leaked as loose siblings of it.
  // Both body and footer spans belong inside the light DOM of <de-alert>.
  const slotPlacement = await page.evaluate(() => {
    const alertEl = document.querySelector('#lit-alert-wrapper de-alert');
    if (!alertEl) { 
      throw new Error('de-alert element not found in wrapper');
    }
    const spans = Array.from(alertEl.querySelectorAll('span'));
    // if (spans.length > 0) {
    //   throw new Error(`spans.length: ${spans.length}`);
    // }
    return {
      bodyInAlert: spans.some((s) => s.textContent?.trim() === 'Alert body content'),
      footerInAlert: spans.some((s) => s.getAttribute('q:slot') === 'footer'),
    };
  });

  expect(slotPlacement.bodyInAlert).toBe(true);
  expect(slotPlacement.footerInAlert).toBe(true);

  // No slot spans should be outside <de-alert> in the wrapper.
  const allSpans = await page.locator('#lit-alert-wrapper span').count();
  const spansInsideAlert = await page
    .locator('#lit-alert-wrapper de-alert span')
    .count();
  expect(spansInsideAlert).toBe(allSpans);
});

test('lit ssr bridge returns server-rendered lit html', async ({ page }) => {
  const response = await page.request.get('/lit/ssr/bridge');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/html');

  const html = await response.text();

  expect(html).toContain('q:render="ssr"');

  // de-button with size="md" prop — DSD shadow content includes data-size="md"
  expect(html).toMatch(
    /<de-button[^>]*size="md"[^>]*>[\s\S]*?<template[^>]*shadowrootmode="open"[^>]*>[\s\S]*?<button[^>]*data-size="md"[^>]*>[\s\S]*?<\/template>[\s\S]*?First Lit SSR Button[\s\S]*?<\/de-button>/,
  );
  expect(html).toMatch(
    /<de-button[^>]*size="md"[^>]*>[\s\S]*?<template[^>]*shadowrootmode="open"[^>]*>[\s\S]*?<button[^>]*data-size="md"[^>]*>[\s\S]*?<\/template>[\s\S]*?Second Lit SSR Button[\s\S]*?<\/de-button>/,
  );

  // de-alert with heading prop — DSD shadow content renders heading text; slot content in light DOM
  expect(html).toMatch(
    /<de-alert[^>]*heading="Validation Alert"[^>]*>[\s\S]*?<template[^>]*shadowrootmode="open"[^>]*>[\s\S]*?Validation Alert[\s\S]*?<\/template>[\s\S]*?Alert body content[\s\S]*?Alert footer content[\s\S]*?<\/de-alert>/,
  );

  // No client-side setup markers should appear in the initial server response
  expect(html).not.toContain('__qce_stencil_client_setup_done__');
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
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);
  await expect(
    page.locator('#lit-alert-wrapper de-alert [slot="footer"]'),
  ).toContainText('Alert footer content');

  const csrBridgeFooterContainer = await page.evaluate(() => {
    const alertEl = document.querySelector(
      '#lit-alert-wrapper de-alert',
    ) as HTMLElement | null;
    const footer = alertEl?.shadowRoot?.querySelector('.de-alert__footer');
    if (!footer) {
      return null;
    }

    const style = window.getComputedStyle(footer);
    return {
      borderTopStyle: style.borderTopStyle,
      borderTopWidth: style.borderTopWidth,
    };
  });

  expect(csrBridgeFooterContainer).toEqual({
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  });
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

test('lit csr wrappers route renders generated wrapper hosts', async ({ page }) => {
  await page.goto('/lit/csr/wrappers');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Lit CSR Wrappers Validation',
    }),
  ).toBeVisible();

  await page.waitForFunction(
    () =>
      customElements.get('de-button') != null &&
      customElements.get('de-alert') != null,
  );

  const firstHost = page.locator('#first-lit-wrapper de-button');
  const secondHost = page.locator('#second-lit-wrapper de-button');
  const firstButton = page.locator('#first-lit-wrapper de-button button');
  const secondButton = page.locator('#second-lit-wrapper de-button button');

  await expect(firstHost).toHaveCount(1);
  await expect(secondHost).toHaveCount(1);
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);
  await expect(firstButton).toBeVisible();
  await expect(secondButton).toBeVisible();

  const clickTriple = async (locator: typeof firstButton) => {
    await locator.click();
    await locator.click();
    await locator.click();
  };

  await expect(page.locator('#active-handler')).toContainText(
    'Active handler: alpha',
  );
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

  await clickTriple(secondButton);
  await expect(page.locator('#second-count')).toContainText('Second count: 1');

  await firstHost.evaluate((host) => {
    (globalThis as Record<string, unknown>).__qce_first_lit_wrapper_host__ =
      host;
  });

  await page.locator('#toggle-size').click();
  await expect(page.locator('#button-size')).toContainText('Button size: lg');
  await expect(page.locator('#first-lit-wrapper de-button[size="lg"]')).toBeVisible();
  await expect(page.locator('#second-lit-wrapper de-button[size="lg"]')).toBeVisible();

  const hostInstanceWasPreserved = await firstHost.evaluate((host) => {
    return (
      (globalThis as Record<string, unknown>)
        .__qce_first_lit_wrapper_host__ === host
    );
  });
  expect(hostInstanceWasPreserved).toBe(true);

  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Validation Alert',
  );
  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Alert body content',
  );
  await expect(page.locator('#lit-alert-wrapper')).toContainText(
    'Alert footer content',
  );
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);
  await expect(
    page.locator('#lit-alert-wrapper de-alert [slot="footer"]'),
  ).toContainText('Alert footer content');

  const wrapperFooterContainer = await page.evaluate(() => {
    const alertEl = document.querySelector(
      '#lit-alert-wrapper de-alert',
    ) as HTMLElement | null;
    const footer = alertEl?.shadowRoot?.querySelector('.de-alert__footer');
    if (!footer) {
      return null;
    }

    const style = window.getComputedStyle(footer);
    return {
      borderTopStyle: style.borderTopStyle,
      borderTopWidth: style.borderTopWidth,
    };
  });

  expect(wrapperFooterContainer).toEqual({
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  });
});

test('lit ssr wrappers route renders generated wrapper hosts', async ({ page }) => {
  await page.goto('/lit/ssr/wrappers');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Lit SSR Wrappers Validation',
    }),
  ).toBeVisible();

  await page.waitForFunction(
    () =>
      customElements.get('de-button') != null &&
      customElements.get('de-alert') != null,
  );

  const firstHost = page.locator('#first-lit-wrapper de-button');
  const secondHost = page.locator('#second-lit-wrapper de-button');
  const firstButton = page.locator('#first-lit-wrapper de-button button');
  const secondButton = page.locator('#second-lit-wrapper de-button button');

  await expect(firstHost).toHaveCount(1);
  await expect(secondHost).toHaveCount(1);
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);
  await expect(firstButton).toBeVisible();
  await expect(secondButton).toBeVisible();

  const clickTriple = async (locator: typeof firstButton) => {
    await locator.click();
    await locator.click();
    await locator.click();
  };

  await expect(page.locator('#active-handler')).toContainText(
    'Active handler: alpha',
  );
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
  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);
  await expect(
    page.locator('#lit-alert-wrapper de-alert [slot="footer"]'),
  ).toContainText('Alert footer content');

  const wrapperFooterContainer = await page.evaluate(() => {
    const alertEl = document.querySelector(
      '#lit-alert-wrapper de-alert',
    ) as HTMLElement | null;
    const footer = alertEl?.shadowRoot?.querySelector('.de-alert__footer');
    if (!footer) {
      return null;
    }

    const style = window.getComputedStyle(footer);
    return {
      borderTopStyle: style.borderTopStyle,
      borderTopWidth: style.borderTopWidth,
    };
  });

  expect(wrapperFooterContainer).toEqual({
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  });
});

test('lit ssr wrappers: shadow DOM is not double-rendered after hydration', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__deAlertShadowCountAfterFirstUpdate = -1;
    const originalDefine = customElements.define.bind(customElements);
    Object.defineProperty(customElements, 'define', {
      value(
        name: string,
        ctor: CustomElementConstructor,
        opts?: ElementDefinitionOptions,
      ) {
        const result = originalDefine(name, ctor, opts);
        if (name === 'de-alert') {
          Promise.resolve().then(() =>
            Promise.resolve().then(() => {
              const el = document.querySelector(
                '#lit-alert-wrapper de-alert',
              ) as HTMLElement | null;
              (window as any).__deAlertShadowCountAfterFirstUpdate =
                el?.shadowRoot?.querySelectorAll('.de-alert').length ?? -1;
            }),
          );
        }
        return result;
      },
      writable: true,
      configurable: true,
    });
  });

  await page.goto('/lit/ssr/wrappers');

  await page.waitForFunction(
    () => (window as any).__deAlertShadowCountAfterFirstUpdate !== -1,
  );

  const count = await page.evaluate(
    () => (window as any).__deAlertShadowCountAfterFirstUpdate,
  );

  expect(count).toBe(1);
});

test('lit ssr wrappers: light DOM slot content is not duplicated after signal change', async ({
  page,
}) => {
  await page.goto('/lit/ssr/wrappers');

  await page.waitForFunction(
    () =>
      customElements.get('de-button') != null &&
      customElements.get('de-alert') != null,
  );

  await page.locator('#toggle-size').click();
  await expect(page.locator('#button-size')).toContainText('Button size: lg');

  await expect(page.locator('#lit-alert-wrapper de-alert')).toHaveCount(1);

  const slotPlacement = await page.evaluate(() => {
    const alertEl = document.querySelector('#lit-alert-wrapper de-alert');
    if (!alertEl) return { bodyInAlert: false, footerInAlert: false };
    const spans = Array.from(alertEl.querySelectorAll('span'));
    return {
      bodyInAlert: spans.some((s) => s.textContent?.trim() === 'Alert body content'),
      footerInAlert: spans.some((s) => s.getAttribute('q:slot') === 'footer'),
    };
  });

  expect(slotPlacement.bodyInAlert).toBe(true);
  expect(slotPlacement.footerInAlert).toBe(true);
});
