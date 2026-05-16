import { createLitPlannedWrites } from './generated-output.js';

export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

interface ResolveRuntimeImportsInput {
  source: {
    type: 'CEM' | 'PACKAGE_NAME';
    packageName?: string;
  };
  adapterOptions?: Record<string, unknown>;
}

export async function resolveRuntimeImports({
  source,
  adapterOptions,
}: ResolveRuntimeImportsInput): Promise<{ libraryImport?: string }> {
  const runtime =
    typeof adapterOptions?.runtime === 'object' &&
    adapterOptions.runtime !== null &&
    !Array.isArray(adapterOptions.runtime)
      ? (adapterOptions.runtime as Record<string, unknown>)
      : undefined;

  const libraryImportOverride =
    typeof runtime?.libraryImport === 'string' &&
    runtime.libraryImport.trim().length > 0
      ? runtime.libraryImport
      : undefined;

  if (source.type === 'CEM') {
    return libraryImportOverride != null
      ? { libraryImport: libraryImportOverride }
      : {};
  }

  const packageName = source.packageName;
  if (typeof packageName !== 'string' || packageName.trim().length === 0) {
    return {};
  }

  return { libraryImport: libraryImportOverride ?? packageName };
}

export async function probeSSR(): Promise<{ available: boolean }> {
  return { available: false };
}

export function createGeneratedOutput(input: {
  projectId?: string;
  libraryName?: string;
  componentDefinitions?: Array<{
    tagName: string;
    props: Array<{ name: string; type: string; required: boolean }>;
    events: Array<{ name: string; type: string }>;
    slots: Array<{ name: string }>;
  }>;
  runtimeImports?: {
    libraryImport?: string;
  };
  ssrAvailable?: boolean;
}): Array<{
  relativePath: string;
  content: string;
}> {
  return createLitPlannedWrites(input);
}
