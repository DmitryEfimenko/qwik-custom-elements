export const metadata = {
  adapterId: 'stencil',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

interface ValidateProjectInput {
  projectId?: string;
  cwd?: string;
  runtimeResolution?: {
    resolveSourcePackageRoot?: (packageName: string) => string;
    resolveImportSpecifier?: (
      specifier: string,
      packageRoot?: string,
    ) => string;
  };
  source: {
    type: 'CEM' | 'PACKAGE_NAME';
    packageName?: string;
  };
  adapterOptions?: Record<string, unknown>;
}

interface ResolveRuntimeImportsResult {
  loaderImport: string;
  hydrateImport?: string;
}

interface ResolveRuntimeImportsOutcome {
  runtimeImports: ResolveRuntimeImportsResult;
  observedErrorCodes?: string[];
}

interface ProbeSsrInput {
  runtimeImports?: {
    loaderImport?: unknown;
    hydrateImport?: unknown;
  };
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

export function resolveRuntimeImports({
  projectId,
  runtimeResolution,
  source,
  adapterOptions,
}: ValidateProjectInput):
  | ResolveRuntimeImportsResult
  | ResolveRuntimeImportsOutcome {
  const runtime = isRecord(adapterOptions?.runtime)
    ? adapterOptions.runtime
    : undefined;
  const loaderImport = validateOptionalRuntimeOverride(
    runtime,
    'loaderImport',
    'QCE_STENCIL_RUNTIME_LOADER_OVERRIDE_INVALID',
    `Stencil ${source.type} projects must provide a non-empty adapterOptions.runtime.loaderImport override when the override is set.`,
  );
  const hydrateImport = validateOptionalRuntimeOverride(
    runtime,
    'hydrateImport',
    'QCE_STENCIL_RUNTIME_HYDRATE_OVERRIDE_INVALID',
    `Stencil ${source.type} projects must provide a non-empty adapterOptions.runtime.hydrateImport override when the override is set.`,
  );

  if (source.type === 'CEM') {
    if (loaderImport == null) {
      throw createValidationError(
        'QCE_STENCIL_RUNTIME_LOADER_REQUIRED',
        'Stencil CEM projects must provide adapterOptions.runtime.loaderImport.',
      );
    }

    return {
      loaderImport,
      hydrateImport,
    };
  }

  const packageRoot = resolvePackageRootForProject(
    source.packageName,
    runtimeResolution,
  );
  const resolvedLoaderImport = resolveRequiredPackageRuntimeImport({
    projectId,
    packageName: source.packageName,
    packageRoot,
    runtimeResolution,
    specifier: loaderImport ?? `${source.packageName}/loader`,
    field: 'loader',
  });
  const observedErrorCodes: string[] = [];
  const resolvedHydrateImport = resolveOptionalPackageRuntimeImport({
    projectId,
    packageName: source.packageName,
    packageRoot,
    runtimeResolution,
    specifier: hydrateImport ?? `${source.packageName}/hydrate`,
    field: 'hydrate',
    observedErrorCodes,
  });

  const runtimeImports: ResolveRuntimeImportsResult = {
    loaderImport: resolvedLoaderImport,
  };

  if (resolvedHydrateImport != null) {
    runtimeImports.hydrateImport = resolvedHydrateImport;
  }

  if (observedErrorCodes.length === 0) {
    return runtimeImports;
  }

  return {
    runtimeImports,
    observedErrorCodes,
  };
}

export async function probeSSR({
  runtimeImports,
}: ProbeSsrInput = {}): Promise<{ available: boolean }> {
  return {
    available:
      isNonEmptyString(runtimeImports?.loaderImport) &&
      isNonEmptyString(runtimeImports?.hydrateImport),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function resolvePackageRootForProject(
  packageName: string | undefined,
  runtimeResolution: ValidateProjectInput['runtimeResolution'],
): string | undefined {
  return runtimeResolution?.resolveSourcePackageRoot?.(packageName ?? '');
}

function resolveRequiredPackageRuntimeImport(params: {
  projectId?: string;
  packageName?: string;
  packageRoot?: string;
  runtimeResolution?: ValidateProjectInput['runtimeResolution'];
  specifier: string;
  field: 'loader' | 'hydrate';
}): string {
  const {
    projectId,
    packageName,
    packageRoot,
    runtimeResolution,
    specifier,
    field,
  } = params;

  try {
    runtimeResolution?.resolveImportSpecifier?.(specifier, packageRoot);
    return specifier;
  } catch (error) {
    throw createValidationError(
      getRuntimeResolutionErrorCode(field),
      createProjectAwareMessage(
        projectId,
        `Could not resolve Stencil ${field} runtime import "${specifier}" for source package "${packageName}": ${toErrorMessage(error)}`,
      ),
    );
  }
}

function resolveOptionalPackageRuntimeImport(params: {
  projectId?: string;
  packageName?: string;
  packageRoot?: string;
  runtimeResolution?: ValidateProjectInput['runtimeResolution'];
  specifier: string;
  field: 'hydrate';
  observedErrorCodes: string[];
}): string | undefined {
  const {
    packageRoot,
    runtimeResolution,
    specifier,
    field,
    observedErrorCodes,
  } = params;

  try {
    runtimeResolution?.resolveImportSpecifier?.(specifier, packageRoot);
    return specifier;
  } catch {
    observedErrorCodes.push(getRuntimeResolutionErrorCode(field));

    return undefined;
  }
}

function getRuntimeResolutionErrorCode(field: 'loader' | 'hydrate'): string {
  return field === 'loader'
    ? 'QCE_STENCIL_RUNTIME_LOADER_RESOLVE_FAILED'
    : 'QCE_STENCIL_RUNTIME_HYDRATE_RESOLVE_FAILED';
}

function createProjectAwareMessage(
  projectId: string | undefined,
  message: string,
): string {
  return projectId == null ? message : `Project "${projectId}": ${message}`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
