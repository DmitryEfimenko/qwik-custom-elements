import { createHash } from 'node:crypto';
import type { GenerateContext, NormalizedMetadata } from '../types';
import {
  emitComponentWrapper,
  type EmittedWrapperFile,
} from './emit-component-wrappers';
import { emitRuntimeBootstrap } from './emit-runtime-bootstrap';

export interface EmittedGeneratorOutput {
  runtimeBootstrap: string;
  wrappers: EmittedWrapperFile[];
  indexSource: string;
  manifestSource: string;
}

function getExportName(fileName: string): string {
  return fileName.replace(/\.(tsx?|jsx?)$/, '');
}

function getDeterministicGeneratedAt(
  context: GenerateContext,
  normalized: NormalizedMetadata,
): string {
  const fingerprint = {
    importMode: context.config.importMode,
    stencilPath: context.config.stencilPath ?? null,
    packageName: context.config.packageName ?? null,
    provider: normalized.provider,
    sourceRoot: normalized.sourceRoot,
    provenance: normalized.provenance,
    components: normalized.components,
  };

  const hash = createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex');
  const milliseconds = Number.parseInt(hash.slice(0, 12), 16) % 4102444800000;

  return new Date(milliseconds).toISOString();
}

function emitGeneratedIndex(wrappers: EmittedWrapperFile[]): string {
  const lines = [`export * from './runtime.generated';`];

  for (const wrapper of wrappers) {
    lines.push(`export * from './${getExportName(wrapper.fileName)}';`);
  }

  return `${lines.join('\n')}\n`;
}

function emitGenerationManifest(
  context: GenerateContext,
  normalized: NormalizedMetadata,
  wrappers: EmittedWrapperFile[],
): string {
  const manifest = {
    generatedAt: getDeterministicGeneratedAt(context, normalized),
    provider: normalized.provider,
    sourceRoot: normalized.sourceRoot,
    provenance: normalized.provenance,
    importMode: context.config.importMode,
    source: {
      stencilPath: context.config.stencilPath,
      packageName: context.config.packageName,
    },
    componentCount: normalized.components.length,
    components: normalized.components.map((component, index) => ({
      tagName: component.tagName,
      componentName: component.componentName,
      wrapperFile: wrappers[index]?.fileName ?? null,
    })),
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function emitGeneratorOutput(
  context: GenerateContext,
  normalized: NormalizedMetadata,
): EmittedGeneratorOutput {
  const wrappers = normalized.components
    .map((component) => emitComponentWrapper(component))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  return {
    runtimeBootstrap: emitRuntimeBootstrap(context),
    wrappers,
    indexSource: emitGeneratedIndex(wrappers),
    manifestSource: emitGenerationManifest(context, normalized, wrappers),
  };
}
