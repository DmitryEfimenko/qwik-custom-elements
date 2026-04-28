import { describe, expect, it } from 'vitest';

import { createGeneratedOutput, metadata, probeSSR } from './index.js';
import {
  createGeneratedOutput as createSsrGeneratedOutput,
  renderComponentSsrHtml,
} from './ssr.js';

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
      componentDefinitions: [{ tagName: 'lit-button' }],
      ssrAvailable: false,
    });

    expect(plannedWrites).toEqual([
      expect.objectContaining({ relativePath: 'index.ts' }),
      expect.objectContaining({ relativePath: 'lit-button.ts' }),
    ]);

    const indexWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'index.ts',
    );
    const wrapperWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'lit-button.ts',
    );

    expect(indexWrite?.content).toContain(
      'export const generatedComponentTags = ["lit-button"] as const;',
    );
    expect(indexWrite?.content).toContain(
      "export { QwikLitButton } from './lit-button';",
    );
    expect(wrapperWrite?.content).toContain(
      'export const QwikLitButton = "lit-button" as const;',
    );
    expect(wrapperWrite?.content).not.toContain('QwikLitButtonSsrHtml');
  });

  it('keeps SSR placeholder markup ownership in the Lit SSR subpath', () => {
    expect(renderComponentSsrHtml({ tagName: 'lit-button' })).toBe(
      '<lit-button></lit-button>',
    );

    const plannedWrites = createSsrGeneratedOutput({
      projectId: 'demo',
      componentDefinitions: [{ tagName: 'lit-button' }],
      ssrAvailable: true,
    });
    const wrapperWrite = plannedWrites.find(
      (plannedWrite: { relativePath: string }) =>
        plannedWrite.relativePath === 'lit-button.ts',
    );

    expect(wrapperWrite?.content).toContain(
      'export const QwikLitButtonSsrHtml = "<lit-button></lit-button>" as const;',
    );
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
});
