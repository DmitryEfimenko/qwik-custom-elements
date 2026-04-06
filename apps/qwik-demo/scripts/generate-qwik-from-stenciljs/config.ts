import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GeneratorCliOptions, GeneratorConfig } from './types';

const DEFAULT_CONFIG_FILE =
  'scripts/generate-qwik-from-stenciljs/generator.config.json';

const DEFAULT_CONFIG: GeneratorConfig = {
  outDir: 'src/components/generated/stencil',
  importMode: 'demo',
  cleanOutput: true,
};

const VALID_IMPORT_MODES = new Set(['demo', 'package']);

function panicConfig(message: string): never {
  throw new Error(`Invalid generator config: ${message}`);
}

function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalString(
  value: unknown,
  fieldPath: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    panicConfig(`${fieldPath} must be a string when provided.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    panicConfig(`${fieldPath} cannot be an empty string.`);
  }

  return trimmed;
}

function readRequiredString(value: unknown, fieldPath: string): string {
  const parsed = readOptionalString(value, fieldPath);
  if (!parsed) {
    panicConfig(`${fieldPath} is required.`);
  }
  return parsed;
}

function readRequiredBoolean(value: unknown, fieldPath: string): boolean {
  if (typeof value !== 'boolean') {
    panicConfig(`${fieldPath} must be a boolean.`);
  }
  return value;
}

function validateImportMode(
  value: unknown,
  fieldPath: string,
): 'demo' | 'package' {
  if (typeof value !== 'string' || !VALID_IMPORT_MODES.has(value)) {
    panicConfig(`${fieldPath} must be either "demo" or "package".`);
  }
  return value as 'demo' | 'package';
}

function validateRuntimeImports(
  value: unknown,
): GeneratorConfig['runtimeImports'] {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    panicConfig('runtimeImports must be an object when provided.');
  }

  const candidate = value as Record<string, unknown>;
  return {
    demoDefineCustomElements: readOptionalString(
      candidate.demoDefineCustomElements,
      'runtimeImports.demoDefineCustomElements',
    ),
    demoRenderToString: readOptionalString(
      candidate.demoRenderToString,
      'runtimeImports.demoRenderToString',
    ),
    packageLoader: readOptionalString(
      candidate.packageLoader,
      'runtimeImports.packageLoader',
    ),
    packageHydrate: readOptionalString(
      candidate.packageHydrate,
      'runtimeImports.packageHydrate',
    ),
  };
}

export function validateGeneratorConfig(
  config: GeneratorConfig,
): GeneratorConfig {
  const outDir = readRequiredString(config.outDir, 'outDir');
  const importMode = validateImportMode(config.importMode, 'importMode');
  const cleanOutput = readRequiredBoolean(config.cleanOutput, 'cleanOutput');
  const stencilPath = trimToUndefined(config.stencilPath);
  const packageName = trimToUndefined(config.packageName);
  const runtimeImports = validateRuntimeImports(config.runtimeImports);

  if (stencilPath && packageName) {
    panicConfig(
      'stencilPath and packageName are mutually exclusive. Provide only one source.',
    );
  }

  if (!stencilPath && !packageName) {
    panicConfig('Provide one source: set either stencilPath or packageName.');
  }

  return {
    outDir,
    importMode,
    stencilPath,
    packageName,
    cleanOutput,
    runtimeImports,
  };
}

export function resolveConfigPath(configPath?: string): string {
  return configPath
    ? resolve(process.cwd(), configPath)
    : resolve(process.cwd(), DEFAULT_CONFIG_FILE);
}

export function loadGeneratorConfig(configPath?: string): GeneratorConfig {
  const resolvedPath = resolveConfigPath(configPath);

  if (!existsSync(resolvedPath)) {
    panicConfig(
      `Missing config file at ${resolvedPath}. Create generator.config.json or pass --config.`,
    );
  }

  const rawJson = readFileSync(resolvedPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error.';
    panicConfig(`Unable to parse ${resolvedPath}: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    panicConfig(`Top-level JSON in ${resolvedPath} must be an object.`);
  }

  const typedParsed = parsed as Partial<GeneratorConfig>;

  return validateGeneratorConfig({
    ...DEFAULT_CONFIG,
    ...typedParsed,
  });
}

export function mergeCliOverrides(
  config: GeneratorConfig,
  overrides: GeneratorCliOptions,
): GeneratorConfig {
  const merged: GeneratorConfig = {
    ...config,
    ...(overrides.outDir ? { outDir: overrides.outDir.trim() } : {}),
    ...(overrides.importMode ? { importMode: overrides.importMode } : {}),
    ...(typeof overrides.cleanOutput === 'boolean'
      ? { cleanOutput: overrides.cleanOutput }
      : {}),
  };

  if (overrides.stencilPath) {
    merged.stencilPath = overrides.stencilPath.trim();
    merged.packageName = undefined;
  }

  if (overrides.packageName) {
    merged.packageName = overrides.packageName.trim();
    merged.stencilPath = undefined;
  }

  if (overrides.stencilPath && overrides.packageName) {
    merged.stencilPath = overrides.stencilPath.trim();
    merged.packageName = overrides.packageName.trim();
  }

  return validateGeneratorConfig(merged);
}
