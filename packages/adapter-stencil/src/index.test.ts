import { describe, expect, it } from 'vitest';

import { metadata, probeSSR } from './index';

describe('adapter-stencil metadata contract', () => {
  it('declares deterministic capabilities for source and SSR runtime ownership', () => {
    expect(metadata).toEqual({
      adapterId: 'stencil',
      supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
      supportsSsrProbe: true,
      ssrRuntimeSubpath: './ssr',
    });
  });

  it('reports SSR availability through probeSSR', async () => {
    await expect(probeSSR()).resolves.toEqual({ available: true });
  });
});
