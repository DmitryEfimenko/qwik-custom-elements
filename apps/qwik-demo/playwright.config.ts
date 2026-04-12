import { defineConfig, devices } from '@playwright/test';

const runtime = process.env.PLAYWRIGHT_RUNTIME === 'dev' ? 'dev' : 'preview';
const isDevRuntime = runtime === 'dev';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: 'http://127.0.0.1:4173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: isDevRuntime
      ? 'pnpm --filter qwik-demo run dev:e2e'
      : 'pnpm --filter qwik-demo run preview:e2e',
    url: 'http://127.0.0.1:4173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
