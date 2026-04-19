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
  if (source.type !== 'CEM') {
    return;
  }

  const runtime = isRecord(adapterOptions?.runtime)
    ? adapterOptions.runtime
    : undefined;
  const loaderImport =
    typeof runtime?.loaderImport === 'string' &&
    runtime.loaderImport.trim() !== ''
      ? runtime.loaderImport
      : undefined;

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

function createValidationError(
  code: string,
  message: string,
): Error & {
  code: string;
} {
  return Object.assign(new Error(message), { code });
}
