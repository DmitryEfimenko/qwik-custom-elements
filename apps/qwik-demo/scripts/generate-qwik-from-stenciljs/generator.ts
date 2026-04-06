import { mergeCliOverrides } from './config';
import { emitGeneratorOutput } from './emitters';
import { normalizeMetadata } from './normalization';
import { writeGeneratedOutput } from './output';
import { loadRawMetadata } from './providers';
import { resolveStencilSource } from './source';
import type { GeneratorCliOptions, GeneratorConfig } from './types';

export async function runGenerator(
  config: GeneratorConfig,
  cliOverrides: GeneratorCliOptions,
): Promise<void> {
  void cliOverrides;
  const context = {
    config,
    source: resolveStencilSource(config),
  };

  const rawMetadata = await loadRawMetadata(context);
  const normalizedMetadata = normalizeMetadata(rawMetadata);
  const emittedOutput = emitGeneratorOutput(context, normalizedMetadata);

  writeGeneratedOutput(context, emittedOutput);
}

export async function runGeneratorWithOverrides(
  baseConfig: GeneratorConfig,
  cliOverrides: GeneratorCliOptions,
): Promise<void> {
  const mergedConfig = mergeCliOverrides(baseConfig, cliOverrides);
  await runGenerator(mergedConfig, cliOverrides);
}
