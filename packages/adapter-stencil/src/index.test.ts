import { describe, expect, it } from 'vitest';

import {
  metadata,
  probeSSR,
  resolveRuntimeImports,
  validateProject,
} from './index';

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

  it('allows PACKAGE_NAME projects to rely on package-aware runtime defaults', () => {
    expect(() =>
      validateProject({
        source: { type: 'PACKAGE_NAME' },
      }),
    ).not.toThrow();
  });

  it('resolves PACKAGE_NAME runtime imports from package-aware defaults', () => {
    expect(
      resolveRuntimeImports({
        source: {
          type: 'PACKAGE_NAME',
          packageName: '@acme/stencil-lib',
        },
      }),
    ).toEqual({
      loaderImport: '@acme/stencil-lib/loader',
      hydrateImport: '@acme/stencil-lib/hydrate',
    });
  });

  it('prefers explicit PACKAGE_NAME runtime overrides over package-aware defaults', () => {
    expect(
      resolveRuntimeImports({
        source: {
          type: 'PACKAGE_NAME',
          packageName: '@acme/stencil-lib',
        },
        adapterOptions: {
          runtime: {
            loaderImport: './runtime/loader',
            hydrateImport: './runtime/hydrate',
          },
        },
      }),
    ).toEqual({
      loaderImport: './runtime/loader',
      hydrateImport: './runtime/hydrate',
    });
  });

  it('rejects blank PACKAGE_NAME runtime loader overrides', () => {
    expect(() =>
      validateProject({
        source: { type: 'PACKAGE_NAME' },
        adapterOptions: {
          runtime: {
            loaderImport: '   ',
          },
        },
      }),
    ).toThrowError(
      'Stencil PACKAGE_NAME projects must provide a non-empty adapterOptions.runtime.loaderImport override when the override is set.',
    );
  });

  it('rejects blank PACKAGE_NAME runtime hydrate overrides', () => {
    expect(() =>
      validateProject({
        source: { type: 'PACKAGE_NAME' },
        adapterOptions: {
          runtime: {
            hydrateImport: '   ',
          },
        },
      }),
    ).toThrowError(
      'Stencil PACKAGE_NAME projects must provide a non-empty adapterOptions.runtime.hydrateImport override when the override is set.',
    );
  });
});
