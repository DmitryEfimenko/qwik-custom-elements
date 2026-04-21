import { describe, expect, it } from 'vitest';

import {
  createGeneratedOutput,
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

  it('reports SSR availability when loader and hydrate imports are both resolvable', async () => {
    const hydrateModuleSpecifier =
      "data:text/javascript,export%20const%20renderToString%20%3D%20()%20%3D%3E%20''%3B";

    await expect(
      probeSSR({
        runtimeImports: {
          loaderImport: '@acme/stencil-lib/loader',
          hydrateImport: hydrateModuleSpecifier,
        },
      }),
    ).resolves.toEqual({ available: true });
  });

  it('reports SSR as unavailable when hydrate module lacks renderToString', async () => {
    const hydrateModuleSpecifier =
      'data:text/javascript,export%20const%20noop%20%3D%20()%20%3D%3E%20undefined%3B';

    await expect(
      probeSSR({
        runtimeImports: {
          loaderImport: '@acme/stencil-lib/loader',
          hydrateImport: hydrateModuleSpecifier,
        },
      }),
    ).resolves.toEqual({ available: false });
  });

  it('reports SSR as unavailable when hydrate module import fails', async () => {
    await expect(
      probeSSR({
        runtimeImports: {
          loaderImport: '@acme/stencil-lib/loader',
          hydrateImport: 'qce-does-not-exist/hydrate',
        },
      }),
    ).resolves.toEqual({ available: false });
  });

  it('reports SSR as unavailable when the loader import is missing', async () => {
    await expect(
      probeSSR({
        runtimeImports: {
          hydrateImport: '@acme/stencil-lib/hydrate',
        },
      }),
    ).resolves.toEqual({ available: false });
  });

  it('reports SSR as unavailable when the hydrate import is missing', async () => {
    await expect(
      probeSSR({
        runtimeImports: {
          loaderImport: '@acme/stencil-lib/loader',
        },
      }),
    ).resolves.toEqual({ available: false });
  });

  it('reports SSR as unavailable when runtime imports are blank', async () => {
    await expect(
      probeSSR({
        runtimeImports: {
          loaderImport: '   ',
          hydrateImport: '   ',
        },
      }),
    ).resolves.toEqual({ available: false });
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

  it('fails when a PACKAGE_NAME loader runtime import cannot be resolved', () => {
    expect(() =>
      resolveRuntimeImports({
        projectId: 'demo',
        source: {
          type: 'PACKAGE_NAME',
          packageName: '@acme/stencil-lib',
        },
        runtimeResolution: {
          resolveSourcePackageRoot: () => '/virtual/@acme/stencil-lib',
          resolveImportSpecifier: (specifier) => {
            if (specifier === '@acme/stencil-lib/loader') {
              throw new Error('Cannot find module');
            }

            return specifier;
          },
        },
      }),
    ).toThrowError(
      'Project "demo": Could not resolve Stencil loader runtime import "@acme/stencil-lib/loader" for source package "@acme/stencil-lib": Cannot find module',
    );
  });

  it('drops hydrate runtime import and reports a diagnostic when hydrate resolution fails', () => {
    expect(
      resolveRuntimeImports({
        projectId: 'demo',
        source: {
          type: 'PACKAGE_NAME',
          packageName: '@acme/stencil-lib',
        },
        runtimeResolution: {
          resolveSourcePackageRoot: () => '/virtual/@acme/stencil-lib',
          resolveImportSpecifier: (specifier) => {
            if (specifier === '@acme/stencil-lib/hydrate') {
              throw new Error('Cannot find module');
            }

            return specifier;
          },
        },
      }),
    ).toEqual({
      runtimeImports: {
        loaderImport: '@acme/stencil-lib/loader',
      },
      observedErrorCodes: ['QCE_STENCIL_RUNTIME_HYDRATE_RESOLVE_FAILED'],
      clientOnlyMode: true,
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

  it('generates Stencil wrapper modules as adapter-owned planned writes', () => {
    const plannedWrites = createGeneratedOutput({
      projectId: 'demo',
      source: { type: 'CEM' },
      runtimeImports: {
        loaderImport: '@acme/stencil-lib/loader',
      },
      componentDefinitions: [
        {
          tagName: 'de-button',
          props: [
            {
              name: 'label',
              type: 'string',
              required: false,
            },
          ],
          events: [
            {
              name: 'ready',
              type: 'CustomEvent<void>',
            },
          ],
          slots: [
            {
              name: 'icon',
            },
          ],
        },
      ],
      ssrAvailable: false,
    });

    const indexWrite = plannedWrites.find(
      (plannedWrite) => plannedWrite.relativePath === 'index.ts',
    );

    const wrapperWrite = plannedWrites.find(
      (plannedWrite) => plannedWrite.relativePath === 'de-button.tsx',
    );

    expect(indexWrite?.content).toContain(
      'export const generatedComponentTags = ["de-button"] as const;',
    );
    expect(indexWrite?.content).toContain(
      "export { QwikDeButton } from './de-button';",
    );

    expect(wrapperWrite?.content).toContain(
      "import { GeneratedStencilCSRComponent, useGeneratedStencilClientSetup } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain(
      'export interface QwikDeButtonProps {',
    );
    expect(wrapperWrite?.content).toContain('  label?: string;');
    expect(wrapperWrite?.content).toContain(
      '  onReady$?: QRL<(event: CustomEvent<void>) => void>;',
    );
    expect(wrapperWrite?.content).toContain(
      '    <GeneratedStencilCSRComponent',
    );
    expect(wrapperWrite?.content).toContain('      tagName="de-button"');
    expect(wrapperWrite?.content).toContain('      props={elementProps}');
    expect(wrapperWrite?.content).toContain('      events={mappedEvents}');
    expect(wrapperWrite?.content).toContain('      slots={["icon"]}');
    expect(wrapperWrite?.content).toContain('      {...passthroughEventProps}');
    expect(wrapperWrite?.content).toContain(
      '    </GeneratedStencilCSRComponent>',
    );
    expect(wrapperWrite?.content).toContain('    <Slot name="icon" />');
  });

  it('generates SSR Stencil wrapper modules when ssrAvailable is true', () => {
    const plannedWrites = createGeneratedOutput({
      projectId: 'demo',
      source: { type: 'CEM' },
      runtimeImports: {
        loaderImport: '@acme/stencil-lib/loader',
        hydrateImport: '@acme/stencil-lib/hydrate',
      },
      componentDefinitions: [
        {
          tagName: 'de-button',
          props: [
            {
              name: 'label',
              type: 'string',
              required: false,
            },
          ],
          events: [
            {
              name: 'ready',
              type: 'CustomEvent<void>',
            },
          ],
          slots: [
            {
              name: 'icon',
            },
          ],
        },
      ],
      ssrAvailable: true,
    });

    const wrapperWrite = plannedWrites.find(
      (plannedWrite) => plannedWrite.relativePath === 'de-button.tsx',
    );

    const runtimeWrite = plannedWrites.find(
      (plannedWrite) => plannedWrite.relativePath === 'runtime.ts',
    );

    const ssrRuntimeWrite = plannedWrites.find(
      (plannedWrite) =>
        plannedWrite.relativePath === 'runtime-ssr.generated.ts',
    );

    expect(wrapperWrite?.content).toContain(
      "import { GeneratedStencilComponent, useGeneratedStencilClientSetup } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain('    <GeneratedStencilComponent');
    expect(wrapperWrite?.content).toContain('    </GeneratedStencilComponent>');

    expect(runtimeWrite?.content).toContain(
      "export * from './runtime-ssr.generated';",
    );

    expect(ssrRuntimeWrite).toBeDefined();
    expect(ssrRuntimeWrite?.content).toContain('@acme/stencil-lib/hydrate');
    expect(ssrRuntimeWrite?.content).toContain('GeneratedStencilComponent');
  });
});
