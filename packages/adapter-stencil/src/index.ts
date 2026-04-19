export const metadata = {
  adapterId: 'stencil',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

interface ValidateProjectInput {
  source: {
    type: 'CEM' | 'PACKAGE_NAME';
  };
  adapterOptions?: Record<string, unknown>;
}

export function validateProject({
  source,
  adapterOptions,
}: ValidateProjectInput): void {
  const runtime = isRecord(adapterOptions?.runtime)
    ? adapterOptions.runtime
    : undefined;

  const loaderImport = validateOptionalRuntimeOverride(
    runtime,
    'loaderImport',
    'QCE_STENCIL_RUNTIME_LOADER_OVERRIDE_INVALID',
    `Stencil ${source.type} projects must provide a non-empty adapterOptions.runtime.loaderImport override when the override is set.`,
  );
  validateOptionalRuntimeOverride(
    runtime,
    'hydrateImport',
    'QCE_STENCIL_RUNTIME_HYDRATE_OVERRIDE_INVALID',
    `Stencil ${source.type} projects must provide a non-empty adapterOptions.runtime.hydrateImport override when the override is set.`,
  );

  if (source.type !== 'CEM') {
    return;
  }

  if (loaderImport == null) {
    throw createValidationError(
      'QCE_STENCIL_RUNTIME_LOADER_REQUIRED',
      'Stencil CEM projects must provide adapterOptions.runtime.loaderImport.',
    );
  }
}

export async function probeSSR(): Promise<{ available: boolean }> {
  return { available: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateOptionalRuntimeOverride(
  runtime: Record<string, unknown> | undefined,
  field: 'loaderImport' | 'hydrateImport',
  code: string,
  message: string,
): string | undefined {
  if (runtime == null || !(field in runtime)) {
    return undefined;
  }

  const value = runtime[field];
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  throw createValidationError(code, message);
}

function createValidationError(
  code: string,
  message: string,
): Error & {
  code: string;
} {
  return Object.assign(new Error(message), { code });
}
