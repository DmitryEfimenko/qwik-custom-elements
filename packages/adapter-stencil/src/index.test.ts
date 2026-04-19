import { describe, expect, it } from 'vitest';

import { metadata, probeSSR, validateProject } from './index';

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

  it('rejects CEM projects without a runtime loader import', () => {
    expect(() =>
      validateProject({
        source: { type: 'CEM' },
        adapterOptions: {
          runtime: {
            hydrateImport: '@acme/stencil-lib/hydrate',
          },
        },
      }),
    ).toThrowError(
      'Stencil CEM projects must provide adapterOptions.runtime.loaderImport.',
    );
  });

  it('allows CEM projects to omit runtime hydrate import', () => {
    expect(() =>
      validateProject({
        source: { type: 'CEM' },
        adapterOptions: {
          runtime: {
            loaderImport: '@acme/stencil-lib/loader',
          },
        },
      }),
    ).not.toThrow();
  });
});
