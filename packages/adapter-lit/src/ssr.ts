import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { createLitPlannedWrites } from './generated-output.js';
import { createLitSSRComponent } from './ssr/lit-ssr.js';

export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

interface ValidateProjectInput {
  source: {
    type: 'CEM' | 'PACKAGE_NAME';
    packageName?: string;
  };
  adapterOptions?: Record<string, unknown>;
}

interface ResolveRuntimeImportsInput extends ValidateProjectInput {
  runtimeResolution?: {
    resolveImportSpecifier?: (
      specifier: string,
      packageRoot?: string,
    ) => string;
    resolveSourcePackageRoot?: (packageName: string) => string;
  };
}

interface ProbeSsrInput {
  runtimeImports?: {
    libraryImport?: unknown;
  };
}

export type { LitSSRProps } from './ssr/lit-ssr.js';

export function validateProject({
  source,
  adapterOptions,
}: ValidateProjectInput) {
  const runtime = isRecord(adapterOptions?.runtime)
    ? adapterOptions.runtime
    : undefined;
  const libraryImport = validateOptionalRuntimeOverride(
    runtime,
    'libraryImport',
    'QCE_LIT_RUNTIME_LIBRARY_IMPORT_OVERRIDE_INVALID',
    `Lit ${source.type} projects must provide a non-empty adapterOptions.runtime.libraryImport override when the override is set.`,
  );

  if (source.type === 'CEM' && libraryImport == null) {
    throw createContractError(
      'QCE_LIT_RUNTIME_LIBRARY_IMPORT_REQUIRED',
      'Lit CEM projects must provide adapterOptions.runtime.libraryImport.',
    );
  }
}

export async function resolveRuntimeImports({
  source,
  adapterOptions,
  runtimeResolution,
}: ResolveRuntimeImportsInput): Promise<{ libraryImport: string }> {
  const runtime = isRecord(adapterOptions?.runtime)
    ? adapterOptions.runtime
    : undefined;
  const libraryImportOverride = validateOptionalRuntimeOverride(
    runtime,
    'libraryImport',
    'QCE_LIT_RUNTIME_LIBRARY_IMPORT_OVERRIDE_INVALID',
    `Lit ${source.type} projects must provide a non-empty adapterOptions.runtime.libraryImport override when the override is set.`,
  );

  if (source.type === 'CEM') {
    if (libraryImportOverride == null) {
      throw createContractError(
        'QCE_LIT_RUNTIME_LIBRARY_IMPORT_REQUIRED',
        'Lit CEM projects must provide adapterOptions.runtime.libraryImport.',
      );
    }
    return { libraryImport: libraryImportOverride };
  }

  const packageName = source.packageName;
  if (typeof packageName !== 'string' || packageName.trim().length === 0) {
    throw createContractError(
      'QCE_LIT_RUNTIME_LIBRARY_IMPORT_REQUIRED',
      'Lit PACKAGE_NAME projects must provide source.packageName or adapterOptions.runtime.libraryImport.',
    );
  }

  const rawLibraryImport = libraryImportOverride ?? packageName;
  const libraryImport =
    runtimeResolution?.resolveImportSpecifier != null
      ? runtimeResolution.resolveImportSpecifier(
          rawLibraryImport,
          runtimeResolution.resolveSourcePackageRoot?.(packageName),
        )
      : rawLibraryImport;

  return { libraryImport };
}

export async function probeSSR({
  runtimeImports,
}: ProbeSsrInput = {}): Promise<{ available: boolean }> {
  if (!isNonEmptyString(runtimeImports?.libraryImport)) {
    return { available: false };
  }

  try {
    await import(/* @vite-ignore */ runtimeImports.libraryImport);
    return { available: true };
  } catch {
    return { available: false };
  }
}

export function renderComponentSsrHtml(
  options: { tagName?: unknown; props?: Record<string, unknown> } = {},
): string | null {
  // Keep fallback and hard-failure deterministic for contract tests.
  if (options.tagName == null) {
    return null;
  }

  if (
    typeof options.tagName !== 'string' ||
    options.tagName.trim().length === 0
  ) {
    throw createContractError(
      'QCE_LIT_RUNTIME_TAGNAME_INVALID',
      'Lit SSR render contract requires options.tagName to be a non-empty string when provided.',
    );
  }

  const tagName = options.tagName.trim();

  const serializedProps = serializePropsForHtml(options.props ?? {});
  const openingTag = serializedProps.length
    ? `<${tagName} ${serializedProps}>`
    : `<${tagName}>`;

  return `${openingTag}</${tagName}>`;
}

export type LitGeneratedSsrComponent = ReturnType<typeof createLitSSRComponent>;

export { createLitSSRComponent };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateOptionalRuntimeOverride(
  runtime: Record<string, unknown> | undefined,
  field: string,
  errorCode: string,
  errorMessage: string,
): string | undefined {
  if (!isRecord(runtime) || !(field in runtime)) {
    return undefined;
  }

  const value = runtime[field];
  if (!isNonEmptyString(value)) {
    throw createContractError(errorCode, errorMessage);
  }

  return value;
}

function createContractError(
  code: string,
  message: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
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

function serializePropsForHtml(props: Record<string, unknown>): string {
  return Object.entries(props)
    .filter(
      ([key, value]) => key.trim().length > 0 && isSerializableValue(value),
    )
    .map(([key, value]) => {
      if (value === true) {
        return key;
      }

      return `${key}=${JSON.stringify(String(value))}`;
    })
    .join(' ');
}

function isSerializableValue(
  value: unknown,
): value is string | number | boolean {
  if (value == null) {
    return false;
  }

  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}
