/// <reference types="vitest/globals" />

import { createGeneratedOutput, metadata, probeSSR } from './index.js';
import {
  createGeneratedOutput as createSsrGeneratedOutput,
  probeSSR as probeSsrSubpath,
  renderComponentSsrHtml,
  resolveRuntimeImports,
  validateProject,
} from './ssr/index.js';

describe('adapter-lit SSR runtime import and probe wiring', () => {
  it('rejects non-string runtime libraryImport override', () => {
    expect(() =>
      validateProject({
        source: { type: 'CEM' },
        adapterOptions: {
          runtime: {
            libraryImport: 42,
          },
        },
      } as Parameters<typeof validateProject>[0]),
    ).toThrowError(
      expect.objectContaining({
        code: 'QCE_LIT_RUNTIME_LIBRARY_IMPORT_OVERRIDE_INVALID',
      }),
    );
  });

  it('requires runtime libraryImport override for CEM sources', () => {
    expect(() =>
      validateProject({
        source: { type: 'CEM' },
        adapterOptions: {},
      } as Parameters<typeof validateProject>[0]),
    ).toThrowError(
      expect.objectContaining({
        code: 'QCE_LIT_RUNTIME_LIBRARY_IMPORT_REQUIRED',
      }),
    );
  });

  it('resolves runtime libraryImport from override for CEM sources', async () => {
    await expect(
      resolveRuntimeImports({
        source: { type: 'CEM' },
        adapterOptions: {
          runtime: {
            libraryImport: '@qwik-custom-elements/test-lit-lib',
          },
        },
      } as Parameters<typeof resolveRuntimeImports>[0]),
    ).resolves.toEqual({
      libraryImport: '@qwik-custom-elements/test-lit-lib',
    });
  });

  it('resolves runtime libraryImport from source package for PACKAGE_NAME', async () => {
    await expect(
      resolveRuntimeImports({
        source: {
          type: 'PACKAGE_NAME',
          packageName: '@qwik-custom-elements/test-lit-lib',
        },
        adapterOptions: {},
      } as Parameters<typeof resolveRuntimeImports>[0]),
    ).resolves.toEqual({
      libraryImport: '@qwik-custom-elements/test-lit-lib',
    });
  });

  it('reports SSR unavailable when runtime library import is missing', async () => {
    await expect(probeSsrSubpath()).resolves.toEqual({ available: false });
  });

  it('reports SSR available when runtime library import is loadable', async () => {
    await expect(
      probeSsrSubpath({
        runtimeImports: {
          libraryImport: 'lit',
        },
      }),
    ).resolves.toEqual({ available: true });
  });
});

describe('adapter-lit metadata contract', () => {
  it('declares deterministic capabilities for source support and SSR probing', () => {
    expect(metadata).toEqual({
      adapterId: 'lit',
      supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
      supportsSsrProbe: true,
      ssrRuntimeSubpath: './ssr',
    });
  });

  it('reports root adapter SSR as unavailable for the non-SSR entrypoint', async () => {
    await expect(probeSSR()).resolves.toEqual({ available: false });
  });

  it('generates the stable Lit barrel and wrapper surface from the root entrypoint', () => {
    const plannedWrites = createGeneratedOutput({
      projectId: 'demo',
      componentDefinitions: [
        {
          tagName: 'lit-button',
          props: [{ name: 'size', type: '"lg" | "md"', required: false }],
          events: [{ name: 'ready', type: 'CustomEvent<string>' }],
          slots: [{ name: 'footer' }],
        },
      ] as Array<{
        tagName: string;
        props: Array<{ name: string; type: string; required: boolean }>;
        events: Array<{ name: string; type: string }>;
        slots: Array<{ name: string }>;
      }>,
      ssrAvailable: false,
    });

    expect(plannedWrites).toEqual([
      expect.objectContaining({ relativePath: 'index.ts' }),
      expect.objectContaining({ relativePath: 'runtime.ts' }),
      expect.objectContaining({ relativePath: 'runtime-csr.generated.ts' }),
      expect.objectContaining({ relativePath: 'lit-button.tsx' }),
    ]);

    const indexWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'index.ts',
    );
    const wrapperWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'lit-button.tsx',
    );
    const runtimeWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'runtime.ts',
    );
    const runtimeCsrWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'runtime-csr.generated.ts',
    );

    expect(indexWrite?.content).toContain(
      'export const generatedComponentTags = ["lit-button"] as const;',
    );
    expect(indexWrite?.content).toContain(
      "export { QwikLitButton } from './lit-button';",
    );
    expect(wrapperWrite?.content).toContain(
      "import { Slot, component$ } from '@builder.io/qwik';",
    );
    expect(wrapperWrite?.content).toContain(
      "import type { QRL } from '@builder.io/qwik';",
    );
    expect(wrapperWrite?.content).toContain(
      'export interface QwikLitButtonProps {',
    );
    expect(wrapperWrite?.content).toContain('  size?: "lg" | "md";');
    expect(wrapperWrite?.content).toContain(
      '  onReady$?: QRL<(event: CustomEvent<string>) => void>;',
    );
    expect(runtimeWrite?.content).toContain(
      "export * from './runtime-csr.generated';",
    );
    expect(runtimeCsrWrite?.content).toContain(
      "import { createLitCSRComponent } from '@qwik-custom-elements/adapter-lit/client';",
    );
    expect(runtimeCsrWrite?.content).toContain(
      'export const GeneratedLitCSRComponent = createLitCSRComponent();',
    );
    expect(wrapperWrite?.content).toContain(
      "import { GeneratedLitCSRComponent } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain(
      'export const QwikLitButton = component$<QwikLitButtonProps>((props) => {',
    );
    expect(wrapperWrite?.content).toContain('      tagName="lit-button"');
    expect(wrapperWrite?.content).toContain('      props={elementProps}');
    expect(wrapperWrite?.content).toContain('      events={mappedEvents}');
    expect(wrapperWrite?.content).toContain('      slots={["footer"]}');
    expect(wrapperWrite?.content).toContain('    <Slot />');
    expect(wrapperWrite?.content).toContain(
      '    <span q:slot="footer" style={{ display: \'contents\' }}>',
    );
    expect(wrapperWrite?.content).toContain('      <Slot name="footer" />');
    expect(wrapperWrite?.content).not.toContain('QwikLitButtonSsrHtml');
  });

  it('keeps SSR placeholder markup ownership in the Lit SSR subpath', () => {
    expect(renderComponentSsrHtml({ tagName: 'lit-button' })).toBe(
      '<lit-button></lit-button>',
    );
    expect(
      renderComponentSsrHtml({
        tagName: 'lit-button',
        props: { size: 'lg', disabled: true },
      }),
    ).toBe('<lit-button size="lg" disabled></lit-button>');

    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      componentDefinitions: [
        { tagName: 'lit-button', props: [], events: [], slots: [] },
      ],
      ssrAvailable: true,
    });
    const wrapperWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'lit-button.tsx',
    );

    expect(wrapperWrite?.content).toContain(
      "import { Slot, component$ } from '@builder.io/qwik';",
    );
  });

  it('generates Lit SSR runtime bridge contract and consumes it in wrappers', () => {
    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      componentDefinitions: [
        { tagName: 'lit-button', props: [], events: [], slots: [] },
      ],
      ssrAvailable: true,
    });

    const runtimeBarrelWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'runtime.ts',
    );
    const runtimeSsrWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'runtime-ssr.generated.ts',
    );
    const wrapperWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'lit-button.tsx',
    );

    expect(runtimeBarrelWrite?.content).toContain(
      "export * from './runtime-ssr.generated';",
    );
    expect(runtimeSsrWrite?.content).toContain(
      "import { createLitSSRComponent } from '@qwik-custom-elements/adapter-lit/ssr';",
    );
    expect(runtimeSsrWrite?.content).toContain(
      'export const GeneratedLitComponent = createLitSSRComponent();',
    );
    expect(wrapperWrite?.content).toContain(
      "import { GeneratedLitComponent } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain(
      'export const QwikLitButton = component$<QwikLitButtonProps>((props) => {',
    );
    expect(wrapperWrite?.content).toContain('      tagName="lit-button"');
    expect(wrapperWrite?.content).toContain('      props={elementProps}');
    expect(wrapperWrite?.content).toContain('      events={mappedEvents}');
    expect(wrapperWrite?.content).not.toContain('QwikLitButtonSsrHtml');
  });

  it('returns fallback null when no SSR tagName input is provided', () => {
    expect(renderComponentSsrHtml()).toBeNull();
  });

  it('throws deterministic contract error for blank SSR tagName input', () => {
    expect(() => renderComponentSsrHtml({ tagName: '   ' })).toThrowError(
      expect.objectContaining({
        code: 'QCE_LIT_RUNTIME_TAGNAME_INVALID',
        message:
          'Lit SSR render contract requires options.tagName to be a non-empty string when provided.',
      }),
    );
  });

  it('throws deterministic contract error for non-string SSR tagName input', () => {
    expect(() =>
      renderComponentSsrHtml({ tagName: 42 as unknown as string }),
    ).toThrowError(
      expect.objectContaining({
        code: 'QCE_LIT_RUNTIME_TAGNAME_INVALID',
        message:
          'Lit SSR render contract requires options.tagName to be a non-empty string when provided.',
      }),
    );
  });

  it('uses library-named SSR bridge variable when libraryName is provided', () => {
    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      libraryName: 'test-lit-lib',
      componentDefinitions: [
        { tagName: 'lit-button', props: [], events: [], slots: [] },
      ],
      ssrAvailable: true,
    });

    const runtimeSsrWrite = plannedWrites.find(
      (w: { relativePath: string }) =>
        w.relativePath === 'runtime-ssr.generated.ts',
    );
    const wrapperWrite = plannedWrites.find(
      (w: { relativePath: string }) => w.relativePath === 'lit-button.tsx',
    );

    expect(runtimeSsrWrite?.content).toContain(
      'export const TestLitLibSSRBridgeComponent = createLitSSRComponent();',
    );
    expect(runtimeSsrWrite?.content).not.toContain('GeneratedLitComponent');
    expect(wrapperWrite?.content).toContain(
      "import { TestLitLibSSRBridgeComponent } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain(
      "import { TestLitLibSSRBridgeComponent } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain(
      '    <TestLitLibSSRBridgeComponent',
    );
    expect(wrapperWrite?.content).toContain(
      '    </TestLitLibSSRBridgeComponent>',
    );
  });

  it('uses library-named CSR bridge variable when libraryName is provided', () => {
    const plannedWrites = createGeneratedOutput({
      projectId: 'demo',
      libraryName: 'test-lit-lib',
      componentDefinitions: [
        {
          tagName: 'lit-button',
          props: [],
          events: [],
          slots: [],
        },
      ] as Array<{
        tagName: string;
        props: Array<{ name: string; type: string; required: boolean }>;
        events: Array<{ name: string; type: string }>;
        slots: Array<{ name: string }>;
      }>,
      ssrAvailable: false,
    });

    const runtimeCsrWrite = plannedWrites.find(
      (w: { relativePath: string }) =>
        w.relativePath === 'runtime-csr.generated.ts',
    );
    const wrapperWrite = plannedWrites.find(
      (w: { relativePath: string }) => w.relativePath === 'lit-button.tsx',
    );

    expect(runtimeCsrWrite?.content).toContain(
      'export const TestLitLibCSRBridgeComponent = createLitCSRComponent();',
    );
    expect(runtimeCsrWrite?.content).not.toContain('GeneratedLitCSRComponent');
    expect(wrapperWrite?.content).toContain(
      "import { TestLitLibCSRBridgeComponent } from './runtime';",
    );
    expect(wrapperWrite?.content).toContain(
      '    <TestLitLibCSRBridgeComponent',
    );
    expect(wrapperWrite?.content).toContain(
      '    </TestLitLibCSRBridgeComponent>',
    );
  });

  it('includes library import in SSR runtime when runtimeImports.libraryImport is provided', () => {
    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      libraryName: 'test-lit-lib',
      componentDefinitions: [
        { tagName: 'lit-button', props: [], events: [], slots: [] },
      ],
      runtimeImports: {
        libraryImport: '@qwik-custom-elements/test-lit-lib',
      },
      ssrAvailable: true,
    });

    const runtimeSsrWrite = plannedWrites.find(
      (w: { relativePath: string }) =>
        w.relativePath === 'runtime-ssr.generated.ts',
    );

    expect(runtimeSsrWrite?.content).toContain(
      "import { createLitSSRComponent } from '@qwik-custom-elements/adapter-lit/ssr';",
    );
    expect(runtimeSsrWrite?.content).toContain(
      "import '@qwik-custom-elements/test-lit-lib';",
    );
    expect(runtimeSsrWrite?.content).toContain(
      'export const TestLitLibSSRBridgeComponent = createLitSSRComponent();',
    );
    expect(runtimeSsrWrite?.content).toContain(
      "import { $ } from '@builder.io/qwik';",
    );
    expect(runtimeSsrWrite?.content).toContain(
      "import { createLitSSRClientSetup } from '@qwik-custom-elements/adapter-lit/client';",
    );
    expect(runtimeSsrWrite?.content).toContain(
      "await import('@qwik-custom-elements/test-lit-lib');",
    );
    expect(runtimeSsrWrite?.content).toContain(
      'export const useTestLitLibSSRClientSetup = createLitSSRClientSetup(importLibraryQrl);',
    );
  });

  it('emits default useLitSSRClientSetup name when no libraryName is provided', () => {
    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      componentDefinitions: [
        { tagName: 'lit-button', props: [], events: [], slots: [] },
      ],
      runtimeImports: {
        libraryImport: '@qwik-custom-elements/test-lit-lib',
      },
      ssrAvailable: true,
    });

    const runtimeSsrWrite = plannedWrites.find(
      (w: { relativePath: string }) =>
        w.relativePath === 'runtime-ssr.generated.ts',
    );

    expect(runtimeSsrWrite?.content).toContain(
      'export const useLitSSRClientSetup = createLitSSRClientSetup(importLibraryQrl);',
    );
  });

  it('omits client setup when runtimeImports.libraryImport is not provided', () => {
    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      componentDefinitions: [
        { tagName: 'lit-button', props: [], events: [], slots: [] },
      ],
      ssrAvailable: true,
    });

    const runtimeSsrWrite = plannedWrites.find(
      (w: { relativePath: string }) =>
        w.relativePath === 'runtime-ssr.generated.ts',
    );

    expect(runtimeSsrWrite?.content).toContain(
      "import { createLitSSRComponent } from '@qwik-custom-elements/adapter-lit/ssr';",
    );
    expect(runtimeSsrWrite?.content).not.toContain(
      'Register Lit element classes',
    );
  });
});
