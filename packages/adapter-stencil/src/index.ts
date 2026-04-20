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

interface CemComponentProp {
  name: string;
  type: string;
  required: boolean;
}

interface CemComponentEvent {
  name: string;
  type: string;
}

interface CemComponentSlot {
  name: string;
}

interface CemComponentDefinition {
  tagName: string;
  props: CemComponentProp[];
  events: CemComponentEvent[];
  slots: CemComponentSlot[];
}

interface ProbeSsrInput {
  runtimeImports?: {
    loaderImport?: unknown;
    hydrateImport?: unknown;
  };
}

interface CreateAdditionalPlannedWritesInput {
  projectId?: string;
  source: {
    type: 'CEM' | 'PACKAGE_NAME';
  };
  componentDefinitions?: CemComponentDefinition[];
  runtimeImports?: {
    loaderImport?: unknown;
    hydrateImport?: unknown;
  };
  ssrAvailable?: boolean;
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

export function createAdditionalPlannedWrites({
  projectId,
  componentDefinitions,
  runtimeImports,
  ssrAvailable,
}: CreateAdditionalPlannedWritesInput): Array<{
  relativePath: string;
  content: string;
}> {
  const loaderImport =
    typeof runtimeImports?.loaderImport === 'string' &&
    runtimeImports.loaderImport.trim() !== ''
      ? runtimeImports.loaderImport
      : undefined;

  if (loaderImport == null) {
    return [];
  }

  const hydrateImport =
    typeof runtimeImports?.hydrateImport === 'string' &&
    runtimeImports.hydrateImport.trim() !== ''
      ? runtimeImports.hydrateImport
      : undefined;
  const hasHydrateRuntime = hydrateImport != null;
  const plannedWrites = [
    {
      relativePath: 'runtime.ts',
      content: renderRuntimeBarrelModule(projectId, hasHydrateRuntime),
    },
    {
      relativePath: 'runtime-csr.generated.ts',
      content: renderClientRuntimeModule(projectId, loaderImport),
    },
  ];

  if (hydrateImport != null) {
    plannedWrites.push({
      relativePath: 'runtime-ssr.generated.ts',
      content: renderServerRuntimeModule(projectId, hydrateImport),
    });
  }

  for (const componentDefinition of componentDefinitions ?? []) {
    plannedWrites.push({
      relativePath: `${componentDefinition.tagName}.tsx`,
      content: renderStencilComponentWrapper(
        projectId,
        componentDefinition,
        ssrAvailable === true,
      ),
    });
  }

  return plannedWrites;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function renderClientRuntimeModule(
  projectId: string | undefined,
  loaderImport: string,
): string {
  return [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId ?? 'unknown'}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    "import { $ } from '@builder.io/qwik';",
    "import { createStencilClientSetup } from '@qwik-custom-elements/adapter-stencil/client';",
    `import { defineCustomElements as runtimeDefineCustomElements } from '${loaderImport}';`,
    '',
    'export const defineCustomElements = async (): Promise<void> => {',
    '  await Promise.resolve(runtimeDefineCustomElements());',
    '};',
    '',
    'export const defineCustomElementsQrl = $(defineCustomElements);',
    'export const useGeneratedStencilClientSetup =',
    '  createStencilClientSetup(defineCustomElementsQrl);',
    '',
  ].join('\n');
}

function renderRuntimeBarrelModule(
  projectId: string | undefined,
  hasHydrateRuntime: boolean,
): string {
  const exportLines = ["export * from './runtime-csr.generated';"];

  if (hasHydrateRuntime) {
    exportLines.push("export * from './runtime-ssr.generated';");
  }

  return [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId ?? 'unknown'}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    ...exportLines,
    '',
  ].join('\n');
}

function renderServerRuntimeModule(
  projectId: string | undefined,
  hydrateImport: string,
): string {
  return [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId ?? 'unknown'}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    "import { $ } from '@builder.io/qwik';",
    'import {',
    '  createStencilSSRComponent,',
    '  type StencilRenderToString,',
    "} from '@qwik-custom-elements/adapter-stencil/ssr';",
    '',
    `const hydrateModuleId = '${hydrateImport}';`,
    '',
    'export const renderToString: StencilRenderToString = async (input, options) => {',
    '  const { renderToString: runtimeRenderToString } = await import(',
    '    /* @vite-ignore */ hydrateModuleId',
    '  );',
    '  return runtimeRenderToString(input, options);',
    '};',
    '',
    'export const generatedStencilRenderToStringQrl = $(renderToString);',
    'export const GeneratedStencilComponent = createStencilSSRComponent(',
    '  generatedStencilRenderToStringQrl,',
    ');',
    '',
  ].join('\n');
}

function renderStencilComponentWrapper(
  projectId: string | undefined,
  componentDefinition: CemComponentDefinition,
  ssrAvailable: boolean,
): string {
  const wrapperName = toWrapperName(componentDefinition.tagName);
  const propsTypeName = `${wrapperName}Props`;
  const usesGeneratedStencilComponent = ssrAvailable;
  const slotLines = [
    '    <Slot />',
    ...componentDefinition.slots.map(
      (slot) => `    <Slot name=${JSON.stringify(slot.name)} />`,
    ),
  ];
  const slotListToken =
    componentDefinition.slots.length > 0
      ? JSON.stringify(componentDefinition.slots.map((slot) => slot.name))
      : 'undefined';
  const propLines = componentDefinition.props.map((prop) => {
    const key = isValidIdentifier(prop.name) ? prop.name : `'${prop.name}'`;
    const optionalToken = prop.required ? '' : '?';

    return `  ${key}${optionalToken}: ${prop.type};`;
  });

  const eventPropLines = componentDefinition.events.map((event) => {
    return `  ${toEventPropName(event.name)}?: QRL<(event: ${event.type}) => void>;`;
  });

  propLines.push(...eventPropLines, '  [key: string]: unknown;');

  const importLines = ["import { Slot, component$ } from '@builder.io/qwik';"];

  if (componentDefinition.events.length > 0) {
    importLines.push("import type { QRL } from '@builder.io/qwik';");
  }

  importLines.push(
    usesGeneratedStencilComponent
      ? "import { GeneratedStencilComponent, useGeneratedStencilClientSetup } from './runtime';"
      : "import { useGeneratedStencilClientSetup } from './runtime';",
  );

  const splitPropsLines = [
    '  const isEventBindingKey = (key: string) =>',
    "    /^on[A-Z].*\\$$/.test(key) || key.includes(':');",
    '  const eventProps: Record<string, unknown> = {};',
    '  const elementProps: Record<string, unknown> = {};',
    '',
    '  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {',
    "    if (key === 'children') {",
    '      continue;',
    '    }',
    '',
    '    if (isEventBindingKey(key)) {',
    '      eventProps[key] = value;',
    '      continue;',
    '    }',
    '',
    '    elementProps[key] = value;',
    '  }',
  ];

  const mappedEventLines =
    componentDefinition.events.length > 0
      ? [
          '',
          `  const mappedEventPropKeys = new Set(${JSON.stringify(componentDefinition.events.map((event) => toEventPropName(event.name)))});`,
          '  const passthroughEventProps = Object.fromEntries(',
          '    Object.entries(eventProps).filter(',
          '      ([key]) => !mappedEventPropKeys.has(key),',
          '    ),',
          '  );',
          '',
          '  const events: Record<string, QRL<(...args: any[]) => void>> = {};',
          ...componentDefinition.events.map(
            (event) =>
              `  if (props.${toEventPropName(event.name)}) { events['${event.name}'] = props.${toEventPropName(event.name)}; }`,
          ),
          '  const mappedEvents = Object.keys(events).length > 0 ? events : undefined;',
        ]
      : [
          '',
          '  const passthroughEventProps = eventProps;',
          '  const mappedEvents = undefined;',
        ];

  const bodyLines = usesGeneratedStencilComponent
    ? [
        ...splitPropsLines,
        ...mappedEventLines,
        '',
        '  return (',
        '    <GeneratedStencilComponent',
        `      tagName=${JSON.stringify(componentDefinition.tagName)}`,
        '      props={elementProps}',
        '      events={mappedEvents}',
        `      slots={${slotListToken}}`,
        '      {...passthroughEventProps}',
        '    >',
        ...slotLines,
        '    </GeneratedStencilComponent>',
        '  );',
      ]
    : componentDefinition.events.length > 0
      ? [
          ...splitPropsLines,
          '',
          `  return <${componentDefinition.tagName} {...elementProps} {...eventProps}>`,
          ...slotLines,
          `  </${componentDefinition.tagName}>;`,
        ]
      : [
          '  const elementProps = Object.fromEntries(',
          '    Object.entries(props as Record<string, unknown>).filter(',
          "      ([key]) => key !== 'children',",
          '    ),',
          '  );',
          '',
          `  return <${componentDefinition.tagName} {...elementProps}>`,
          ...slotLines,
          `  </${componentDefinition.tagName}>;`,
        ];

  return [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId ?? 'unknown'}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    ...importLines,
    '',
    `export interface ${propsTypeName} {`,
    ...propLines,
    '}',
    '',
    `export const ${wrapperName} = component$<${propsTypeName}>((props) => {`,
    '  useGeneratedStencilClientSetup();',
    ...bodyLines,
    '});',
    '',
  ].join('\n');
}

function toWrapperName(componentTag: string): string {
  const parts = componentTag.split('-').filter((part) => part.length > 0);
  const normalizedName = parts
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');

  return `Qwik${normalizedName}`;
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function toEventPropName(eventName: string): string {
  const normalizedName = eventName
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');

  return `on${normalizedName}$`;
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
