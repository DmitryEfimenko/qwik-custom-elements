import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, '../..');
const ssrDistPath = path.resolve(packageRoot, 'dist/ssr/index.qwik.mjs');

describe('stencil SSR bridge build output', () => {
  beforeAll(() => {
    // Build before assertions so the test validates the actual emitted runtime bundle.
    execSync('pnpm run build', {
      cwd: packageRoot,
      stdio: 'pipe',
      env: process.env,
    });
  });

  it('keeps server-streaming SSR path in emitted ssr bundle', () => {
    const emitted = readFileSync(ssrDistPath, 'utf-8');

    // Guard against regressions to host-only SSR output.
    expect(emitted).toContain('SSRStream');
    expect(emitted).toContain('SSRRaw');
    expect(emitted).toContain('beforeHydrate');
    expect(emitted).toContain('match(/<body>([\\s\\S]*)<\\/body>/)');
    expect(emitted).toMatch(/typeof window[^\n]*typeof document/);
  });
});
