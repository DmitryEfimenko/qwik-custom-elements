import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type {
  GenerateOptions,
  GenerationProjectResult,
  GenerationResult,
  GeneratorConfig,
  GeneratorProject,
  GeneratorProjectSource,
} from './types.js';

export class GenerationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
  }
}

const SSR_UNSUPPORTED_FALLBACK_CODE = 'QCE_SSR_UNSUPPORTED_FALLBACK';
const PACKAGE_NAME_CEM_DISCOVERY_CANDIDATES = [
  'custom-elements.json',
  path.join('dist', 'custom-elements.json'),
];
const require = createRequire(import.meta.url);

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

export async function generateFromConfig(
  config: GeneratorConfig,
  options: GenerateOptions = {},
): Promise<GenerationResult> {
  const cwd = options.cwd ?? process.cwd();
  const requestedProjectIds = options.targetProjectIds ?? [];
  const requestedProjectIdSet = new Set(requestedProjectIds);
  const sortedProjects = [...config.projects].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (const requestedProjectId of requestedProjectIds) {
    if (!config.projects.some((project) => project.id === requestedProjectId)) {
      throw new GenerationError(
        'QCE_PROJECT_TARGET_UNKNOWN',
        `Unknown project id "${requestedProjectId}" requested via CLI targeting.`,
      );
    }
  }

  const filteredProjects =
    requestedProjectIdSet.size === 0
      ? sortedProjects
      : sortedProjects.filter((project) =>
          requestedProjectIdSet.has(project.id),
        );

  validateProjectOutputSafety(filteredProjects, cwd);

  const projectResults =
    config.parallel === true
      ? await generateProjectsInParallel(
          filteredProjects,
          cwd,
          config.dryRun === true,
        )
      : await generateProjectsSequentially(
          filteredProjects,
          cwd,
          config.dryRun === true,
        );

  const skippedProjectResults =
    requestedProjectIdSet.size === 0
      ? []
      : sortedProjects
          .filter((project) => !requestedProjectIdSet.has(project.id))
          .map((project) => createSkippedProjectResult(project, cwd));

  return {
    dryRun: config.dryRun === true,
    projects: [...projectResults, ...skippedProjectResults].sort((a, b) =>
      a.projectId.localeCompare(b.projectId),
    ),
  };
}

async function generateProjectsSequentially(
  projects: GeneratorProject[],
  cwd: string,
  dryRun: boolean,
): Promise<GenerationProjectResult[]> {
  const projectResults: GenerationProjectResult[] = [];

  for (const project of projects) {
    const result = await generateProject(project, cwd, dryRun);
    projectResults.push(result);
  }

  return projectResults;
}

async function generateProjectsInParallel(
  projects: GeneratorProject[],
  cwd: string,
  dryRun: boolean,
): Promise<GenerationProjectResult[]> {
  const settledResults = await Promise.allSettled(
    projects.map((project) => generateProject(project, cwd, dryRun)),
  );

  const projectResults: GenerationProjectResult[] = [];
  const failures: Array<{ projectId: string; error: unknown }> = [];

  for (let index = 0; index < settledResults.length; index += 1) {
    const settledResult = settledResults[index];
    const project = projects[index];

    if (settledResult.status === 'fulfilled') {
      projectResults.push(settledResult.value);
      continue;
    }

    failures.push({
      projectId: project.id,
      error: settledResult.reason,
    });
  }

  if (failures.length > 0) {
    const details = failures
      .map(({ projectId, error }) => {
        const errorCode =
          error instanceof GenerationError ? error.code : 'QCE_UNEXPECTED';
        const errorMessage = toErrorMessage(error);

        return `${projectId} (${errorCode}): ${errorMessage}`;
      })
      .join(' | ');

    throw new GenerationError(
      'QCE_PARALLEL_PROJECT_FAILURES',
      `Parallel generation failed for ${failures.length} project(s): ${details}`,
    );
  }

  return projectResults;
}

async function generateProject(
  project: GeneratorProject,
  cwd: string,
  dryRun: boolean,
): Promise<GenerationProjectResult> {
  const startedAtMs = Date.now();
  const adapterModule = await loadAdapterModule(project.adapterPackage, cwd);

  validateAdapterSourceCompatibility(project, adapterModule);
  await validateAdapterProject(project, adapterModule);
  const runtimeImportResult = await resolveAdapterRuntimeImports(
    project,
    adapterModule,
    cwd,
  );
  const { runtimeImports } = runtimeImportResult;

  const sourcePath = resolveProjectSourcePath(project.id, project.source, cwd);
  const outDirPath = path.resolve(cwd, project.outDir);
  const componentDefinitions =
    await readComponentDefinitionsFromCem(sourcePath);
  const componentTags = componentDefinitions.map(
    (componentDefinition) => componentDefinition.tagName,
  );
  const adapterSsrCapabilities = resolveAdapterSsrCapabilities(adapterModule);
  const ssrProbe = await probeProjectSsrAvailability(
    project,
    adapterModule,
    runtimeImports,
  );
  const adapterPlannedWrites = await createAdapterPlannedWrites(
    project,
    outDirPath,
    componentTags,
    adapterModule,
    runtimeImports,
    ssrProbe.available,
  );
  const plannedWrites = createPlannedWrites(
    project.id,
    outDirPath,
    componentDefinitions,
    adapterModule,
    ssrProbe.available,
    adapterPlannedWrites,
  );
  const observedErrorCodes = [...runtimeImportResult.observedErrorCodes];

  if (!ssrProbe.available) {
    observedErrorCodes.push(SSR_UNSUPPORTED_FALLBACK_CODE);
  }

  observedErrorCodes.sort((a, b) => a.localeCompare(b));

  if (!dryRun) {
    await mkdir(outDirPath, { recursive: true });
    for (const plannedWrite of plannedWrites) {
      await writeFile(plannedWrite.path, plannedWrite.content, 'utf8');
    }
  }

  const generatedIndexPath = path.join(outDirPath, 'index.ts');
  const durationMs = Date.now() - startedAtMs;

  return {
    projectId: project.id,
    status: 'success',
    durationMs,
    adapterPackage: project.adapterPackage,
    sourcePath,
    outDirPath,
    generatedIndexPath,
    componentTags,
    plannedWrites,
    wroteFiles: !dryRun,
    ssrCapabilities: {
      available: ssrProbe.available,
      supportsSsrProbe: adapterSsrCapabilities.supportsSsrProbe,
      ssrRuntimeSubpath: adapterSsrCapabilities.ssrRuntimeSubpath,
    },
    observedErrorCodes,
  };
}

function resolveAdapterSsrCapabilities(
  adapterModule: Record<string, unknown>,
): {
  supportsSsrProbe: boolean;
  ssrRuntimeSubpath: string | null;
} {
  const metadata =
    adapterModule != null && typeof adapterModule.metadata === 'object'
      ? (adapterModule.metadata as Record<string, unknown>)
      : undefined;

  const supportsSsrProbe = metadata?.supportsSsrProbe === true;
  const ssrRuntimeSubpath =
    typeof metadata?.ssrRuntimeSubpath === 'string'
      ? metadata.ssrRuntimeSubpath
      : null;

  return {
    supportsSsrProbe,
    ssrRuntimeSubpath,
  };
}

async function probeProjectSsrAvailability(
  project: GeneratorProject,
  adapterModule: Record<string, unknown>,
  runtimeImports: Record<string, unknown> | undefined,
): Promise<{ available: boolean }> {
  const probeSSR =
    adapterModule != null && typeof adapterModule.probeSSR === 'function'
      ? adapterModule.probeSSR
      : undefined;

  if (probeSSR == null) {
    return { available: false };
  }

  const probeResult = (await probeSSR({
    projectId: project.id,
    source: project.source,
    adapterOptions: project.adapterOptions ?? {},
    runtimeImports,
  })) as { available?: unknown };

  if (probeResult != null && probeResult.available === true) {
    return { available: true };
  }

  return { available: false };
}

async function resolveAdapterRuntimeImports(
  project: GeneratorProject,
  adapterModule: Record<string, unknown>,
  cwd: string,
): Promise<{
  runtimeImports: Record<string, unknown> | undefined;
  observedErrorCodes: string[];
}> {
  const resolveRuntimeImports =
    adapterModule != null &&
    typeof adapterModule.resolveRuntimeImports === 'function'
      ? adapterModule.resolveRuntimeImports
      : undefined;

  if (resolveRuntimeImports == null) {
    return {
      runtimeImports: undefined,
      observedErrorCodes: [],
    };
  }

  try {
    const resolvedRuntimeImports = await resolveRuntimeImports({
      projectId: project.id,
      cwd,
      runtimeResolution: {
        resolveSourcePackageRoot: (packageName: string) =>
          resolvePackageRootForProject(
            project.id,
            { type: 'PACKAGE_NAME', packageName },
            cwd,
          ),
        resolveImportSpecifier: (specifier: string, packageRoot?: string) =>
          resolveRuntimeImportSpecifier(specifier, cwd, packageRoot),
      },
      source: project.source,
      adapterOptions: project.adapterOptions ?? {},
    });

    const observedErrorCodes = extractObservedRuntimeImportErrorCodes(
      resolvedRuntimeImports,
    );
    const runtimeImports = extractResolvedRuntimeImports(
      resolvedRuntimeImports,
    );

    return {
      runtimeImports,
      observedErrorCodes,
    };
  } catch (error) {
    if (error instanceof GenerationError) {
      throw error;
    }

    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'QCE_ADAPTER_RUNTIME_IMPORTS_INVALID';

    throw new GenerationError(errorCode, toErrorMessage(error));
  }
}

function extractObservedRuntimeImportErrorCodes(
  resolvedRuntimeImports: unknown,
): string[] {
  if (
    resolvedRuntimeImports == null ||
    typeof resolvedRuntimeImports !== 'object' ||
    !('observedErrorCodes' in resolvedRuntimeImports) ||
    !Array.isArray(resolvedRuntimeImports.observedErrorCodes)
  ) {
    return [];
  }

  return resolvedRuntimeImports.observedErrorCodes.filter(
    (errorCode): errorCode is string => typeof errorCode === 'string',
  );
}

function extractResolvedRuntimeImports(
  resolvedRuntimeImports: unknown,
): Record<string, unknown> | undefined {
  if (
    resolvedRuntimeImports == null ||
    typeof resolvedRuntimeImports !== 'object'
  ) {
    return undefined;
  }

  if (
    'runtimeImports' in resolvedRuntimeImports &&
    resolvedRuntimeImports.runtimeImports != null &&
    typeof resolvedRuntimeImports.runtimeImports === 'object'
  ) {
    return resolvedRuntimeImports.runtimeImports as Record<string, unknown>;
  }

  return resolvedRuntimeImports as Record<string, unknown>;
}

function validateAdapterSourceCompatibility(
  project: GeneratorProject,
  adapterModule: Record<string, unknown>,
): void {
  const metadata =
    adapterModule != null && typeof adapterModule.metadata === 'object'
      ? (adapterModule.metadata as Record<string, unknown>)
      : undefined;

  const supportedSourceTypes =
    metadata != null && Array.isArray(metadata.supportedSourceTypes)
      ? metadata.supportedSourceTypes
      : ['CEM'];

  const isSourceSupported = supportedSourceTypes.some(
    (supportedSourceType) => supportedSourceType === project.source.type,
  );

  if (!isSourceSupported) {
    throw new GenerationError(
      'QCE_ADAPTER_SOURCE_INCOMPATIBLE',
      `Project "${project.id}" source type "${project.source.type}" is not supported by adapter "${project.adapterPackage}".`,
    );
  }
}

async function validateAdapterProject(
  project: GeneratorProject,
  adapterModule: Record<string, unknown>,
): Promise<void> {
  const validateProject =
    adapterModule != null && typeof adapterModule.validateProject === 'function'
      ? adapterModule.validateProject
      : undefined;

  if (validateProject == null) {
    return;
  }

  try {
    await validateProject({
      projectId: project.id,
      source: project.source,
      adapterOptions: project.adapterOptions ?? {},
    });
  } catch (error) {
    if (error instanceof GenerationError) {
      throw error;
    }

    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'QCE_ADAPTER_PROJECT_INVALID';

    throw new GenerationError(errorCode, toErrorMessage(error));
  }
}

async function loadAdapterModule(
  adapterPackage: string,
  cwd: string,
): Promise<Record<string, unknown>> {
  if (isRelativeOrAbsoluteSpecifier(adapterPackage)) {
    const resolvedPath = path.isAbsolute(adapterPackage)
      ? adapterPackage
      : path.resolve(cwd, adapterPackage);
    return (await import(pathToFileURL(resolvedPath).href)) as Record<
      string,
      unknown
    >;
  }

  try {
    return (await import(adapterPackage)) as Record<string, unknown>;
  } catch (error) {
    const workspaceLocalPath = resolveWorkspaceLocalAdapterPath(adapterPackage);
    if (workspaceLocalPath == null) {
      throw new GenerationError(
        'QCE_ADAPTER_LOAD_FAILED',
        `Could not load adapter package "${adapterPackage}": ${toErrorMessage(error)}`,
      );
    }

    try {
      return (await import(pathToFileURL(workspaceLocalPath).href)) as Record<
        string,
        unknown
      >;
    } catch (workspaceError) {
      throw new GenerationError(
        'QCE_ADAPTER_LOAD_FAILED',
        `Could not load adapter package "${adapterPackage}": ${toErrorMessage(workspaceError)}`,
      );
    }
  }
}

function isRelativeOrAbsoluteSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    path.isAbsolute(specifier)
  );
}

function resolveWorkspaceLocalAdapterPath(
  adapterPackage: string,
): string | undefined {
  if (!adapterPackage.startsWith('@qwik-custom-elements/')) {
    return undefined;
  }

  const [scope, packageDirectoryName, ...subpathSegments] =
    adapterPackage.split('/');

  if (scope !== '@qwik-custom-elements' || !packageDirectoryName) {
    return undefined;
  }

  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    packageDirectoryName,
  );
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const exportKey =
    subpathSegments.length === 0 ? '.' : `./${subpathSegments.join('/')}`;

  try {
    const packageJson = JSON.parse(
      require('node:fs').readFileSync(packageJsonPath, 'utf8'),
    ) as {
      exports?: Record<string, unknown>;
    };
    const exportTarget = resolvePackageExportImportTarget(
      packageJson.exports?.[exportKey],
    );

    if (typeof exportTarget === 'string') {
      return path.resolve(packageRoot, exportTarget);
    }
  } catch {
    // Fall through to legacy dist-path heuristics.
  }

  const subpath =
    subpathSegments.length === 0
      ? path.join('dist', 'index.js')
      : path.join('dist', subpathSegments.join('/'));
  const subpathWithExtension =
    path.extname(subpath) === '' ? `${subpath}.js` : subpath;

  return path.resolve(packageRoot, subpathWithExtension);
}

function resolvePackageExportImportTarget(
  exportValue: unknown,
): string | undefined {
  if (typeof exportValue === 'string') {
    return exportValue;
  }

  if (exportValue == null || typeof exportValue !== 'object') {
    return undefined;
  }

  const exportRecord = exportValue as Record<string, unknown>;

  if (typeof exportRecord.import === 'string') {
    return exportRecord.import;
  }

  if (typeof exportRecord.default === 'string') {
    return exportRecord.default;
  }

  return undefined;
}

function createSkippedProjectResult(
  project: GeneratorProject,
  cwd: string,
): GenerationProjectResult {
  const outDirPath = path.resolve(cwd, project.outDir);

  return {
    projectId: project.id,
    status: 'skipped',
    durationMs: 0,
    adapterPackage: project.adapterPackage,
    sourcePath: resolveSkippedProjectSourcePath(project.source, cwd),
    outDirPath,
    generatedIndexPath: path.join(outDirPath, 'index.ts'),
    componentTags: [],
    plannedWrites: [],
    wroteFiles: false,
    ssrCapabilities: {
      available: false,
      supportsSsrProbe: false,
      ssrRuntimeSubpath: null,
    },
    observedErrorCodes: [],
  };
}

function resolveSkippedProjectSourcePath(
  source: GeneratorProjectSource,
  cwd: string,
): string {
  if (source.type === 'CEM') {
    return path.resolve(cwd, source.path);
  }

  return source.cemPath == null
    ? `package:${source.packageName}`
    : `package:${source.packageName}#${source.cemPath}`;
}

function resolveProjectSourcePath(
  projectId: string,
  source: GeneratorProjectSource,
  cwd: string,
): string {
  if (source.type === 'CEM') {
    return path.resolve(cwd, source.path);
  }

  const packageRoot = resolvePackageRootForProject(projectId, source, cwd);

  if (source.cemPath != null) {
    return resolvePackageNameOverrideCemPath(projectId, source, packageRoot);
  }

  return discoverPackageNameCemPath(projectId, source, packageRoot);
}

function resolvePackageRootForProject(
  projectId: string,
  source: Extract<GeneratorProjectSource, { type: 'PACKAGE_NAME' }>,
  cwd: string,
): string {
  const packageSpecifier = `${source.packageName}/package.json`;

  try {
    const packageJsonPath = require.resolve(packageSpecifier, { paths: [cwd] });
    return path.dirname(packageJsonPath);
  } catch (error) {
    throw new GenerationError(
      'QCE_PACKAGE_NAME_RESOLVE_FAILED',
      `Project "${projectId}" could not resolve source package "${source.packageName}" from ${cwd}: ${toErrorMessage(error)}`,
    );
  }
}

function resolvePackageNameOverrideCemPath(
  projectId: string,
  source: Extract<GeneratorProjectSource, { type: 'PACKAGE_NAME' }>,
  packageRoot: string,
): string {
  const cemPath = source.cemPath as string;

  if (path.isAbsolute(cemPath)) {
    throw new GenerationError(
      'QCE_PACKAGE_NAME_CEM_PATH_ABSOLUTE',
      `Project "${projectId}" PACKAGE_NAME source.cemPath must be relative to package root; received absolute path "${cemPath}".`,
    );
  }

  const resolvedCemPath = path.resolve(packageRoot, cemPath);
  const relativeToPackageRoot = path.relative(packageRoot, resolvedCemPath);
  const resolvesOutsidePackageRoot =
    relativeToPackageRoot === '..' ||
    relativeToPackageRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToPackageRoot);

  if (resolvesOutsidePackageRoot) {
    throw new GenerationError(
      'QCE_PACKAGE_NAME_CEM_PATH_OUTSIDE_PACKAGE',
      `Project "${projectId}" PACKAGE_NAME source.cemPath resolves outside package root: "${cemPath}".`,
    );
  }

  return resolvedCemPath;
}

function discoverPackageNameCemPath(
  projectId: string,
  source: Extract<GeneratorProjectSource, { type: 'PACKAGE_NAME' }>,
  packageRoot: string,
): string {
  const candidatePaths = PACKAGE_NAME_CEM_DISCOVERY_CANDIDATES.map(
    (candidate) => path.resolve(packageRoot, candidate),
  );

  const existingCandidates: string[] = [];
  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      existingCandidates.push(candidatePath);
    }
  }

  if (existingCandidates.length === 1) {
    return existingCandidates[0];
  }

  if (existingCandidates.length === 0) {
    throw new GenerationError(
      'QCE_PACKAGE_NAME_CEM_NOT_FOUND',
      `Project "${projectId}" could not discover a CEM file for source package "${source.packageName}". Checked: ${PACKAGE_NAME_CEM_DISCOVERY_CANDIDATES.join(', ')}. Set source.cemPath to the manifest path relative to the package root.`,
    );
  }

  throw new GenerationError(
    'QCE_PACKAGE_NAME_CEM_AMBIGUOUS',
    `Project "${projectId}" discovered multiple CEM candidates for source package "${source.packageName}": ${existingCandidates.join(', ')}. Set source.cemPath to disambiguate.`,
  );
}

function resolveRuntimeImportSpecifier(
  specifier: string,
  cwd: string,
  packageRoot?: string,
): string {
  const resolver =
    specifier.startsWith('.') && packageRoot != null
      ? createRequire(path.join(packageRoot, 'package.json'))
      : createRequire(path.resolve(cwd, '__qce_runtime_resolution__.cjs'));

  return resolver.resolve(specifier);
}

function validateProjectOutputSafety(
  projects: GeneratorProject[],
  workspaceRoot: string,
): void {
  const outputDirOwners = new Map<string, string>();

  for (const project of projects) {
    const resolvedOutDir = path.resolve(workspaceRoot, project.outDir);

    validateResolvedOutDirWithinWorkspace(
      project,
      workspaceRoot,
      resolvedOutDir,
    );

    const existingOwner = outputDirOwners.get(resolvedOutDir);
    if (existingOwner != null) {
      throw new GenerationError(
        'QCE_OUTPUT_PATH_COLLISION',
        `Projects "${existingOwner}" and "${project.id}" resolve to the same output directory: ${resolvedOutDir}`,
      );
    }

    outputDirOwners.set(resolvedOutDir, project.id);
  }
}

function validateResolvedOutDirWithinWorkspace(
  project: GeneratorProject,
  workspaceRoot: string,
  resolvedOutDir: string,
): void {
  const relativeToWorkspace = path.relative(workspaceRoot, resolvedOutDir);

  const resolvesOutsideWorkspace =
    relativeToWorkspace === '..' ||
    relativeToWorkspace.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToWorkspace);

  if (resolvesOutsideWorkspace) {
    throw new GenerationError(
      'QCE_OUTPUT_OUTSIDE_WORKSPACE',
      `Project "${project.id}" output path resolves outside workspace root: ${project.outDir}`,
    );
  }
}

function createPlannedWrites(
  projectId: string,
  outDirPath: string,
  componentDefinitions: CemComponentDefinition[],
  adapterModule: Record<string, unknown>,
  ssrAvailable: boolean,
  adapterPlannedWrites: Array<{ path: string; content: string }> = [],
): Array<{ path: string; content: string }> {
  const adapterId = resolveAdapterId(adapterModule);
  const componentTags = componentDefinitions.map(
    (componentDefinition) => componentDefinition.tagName,
  );
  const wrapperWrites = componentDefinitions.map((componentDefinition) => ({
    path: path.join(
      outDirPath,
      `${componentDefinition.tagName}${adapterId === 'stencil' ? '.tsx' : '.ts'}`,
    ),
    content: renderComponentWrapper({
      projectId,
      componentDefinition,
      adapterId,
      ssrAvailable,
      ssrMarkup: renderAdapterSsrMarkup(
        adapterModule,
        componentDefinition.tagName,
        ssrAvailable,
      ),
    }),
  }));

  return [
    {
      path: path.join(outDirPath, 'index.ts'),
      content: renderGeneratedIndex(projectId, componentTags),
    },
    ...adapterPlannedWrites,
    ...wrapperWrites,
  ];
}

async function createAdapterPlannedWrites(
  project: GeneratorProject,
  outDirPath: string,
  componentTags: string[],
  adapterModule: Record<string, unknown>,
  runtimeImports: Record<string, unknown> | undefined,
  ssrAvailable: boolean,
): Promise<Array<{ path: string; content: string }>> {
  const createAdditionalPlannedWrites =
    adapterModule != null &&
    typeof adapterModule.createAdditionalPlannedWrites === 'function'
      ? adapterModule.createAdditionalPlannedWrites
      : undefined;

  if (createAdditionalPlannedWrites == null) {
    return [];
  }

  try {
    const plannedWrites = (await createAdditionalPlannedWrites({
      projectId: project.id,
      source: project.source,
      adapterOptions: project.adapterOptions ?? {},
      runtimeImports,
      componentTags,
      ssrAvailable,
    })) as unknown;

    if (!Array.isArray(plannedWrites)) {
      return [];
    }

    return plannedWrites
      .filter(
        (
          plannedWrite,
        ): plannedWrite is { relativePath: string; content: string } =>
          plannedWrite != null &&
          typeof plannedWrite === 'object' &&
          'relativePath' in plannedWrite &&
          typeof plannedWrite.relativePath === 'string' &&
          'content' in plannedWrite &&
          typeof plannedWrite.content === 'string',
      )
      .map((plannedWrite) => ({
        path: path.join(outDirPath, plannedWrite.relativePath),
        content: plannedWrite.content,
      }));
  } catch (error) {
    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'QCE_ADAPTER_PLANNED_WRITES_INVALID';

    throw new GenerationError(errorCode, toErrorMessage(error));
  }
}

async function readComponentDefinitionsFromCem(
  sourcePath: string,
): Promise<CemComponentDefinition[]> {
  let parsed: unknown;

  try {
    const rawText = await readFile(sourcePath, 'utf8');
    parsed = JSON.parse(rawText) as unknown;
  } catch (error) {
    throw new GenerationError(
      'QCE_CEM_READ_FAILED',
      `Could not read CEM source at ${sourcePath}: ${toErrorMessage(error)}`,
    );
  }

  const manifest = parsed as {
    modules?: Array<{ declarations?: Array<{ tagName?: unknown }> }>;
  };

  if (!Array.isArray(manifest.modules)) {
    throw new GenerationError(
      'QCE_CEM_INVALID_SHAPE',
      `CEM at ${sourcePath} must include a "modules" array.`,
    );
  }

  const definitions = new Map<string, CemComponentDefinition>();

  for (
    let moduleIndex = 0;
    moduleIndex < manifest.modules.length;
    moduleIndex += 1
  ) {
    const module = manifest.modules[moduleIndex];

    if (module.declarations != null && !Array.isArray(module.declarations)) {
      throw new GenerationError(
        'QCE_CEM_INVALID_SHAPE',
        `CEM at ${sourcePath} has invalid shape: modules[${moduleIndex}].declarations must be an array when provided.`,
      );
    }

    const declarations = module.declarations ?? [];

    for (
      let declarationIndex = 0;
      declarationIndex < declarations.length;
      declarationIndex += 1
    ) {
      const declaration = declarations[declarationIndex];

      if (!Object.prototype.hasOwnProperty.call(declaration, 'tagName')) {
        continue;
      }

      if (
        typeof declaration.tagName !== 'string' ||
        declaration.tagName.trim() === ''
      ) {
        throw new GenerationError(
          'QCE_CEM_INVALID_SHAPE',
          `CEM at ${sourcePath} has invalid shape: modules[${moduleIndex}].declarations[${declarationIndex}].tagName must be a non-empty string when provided.`,
        );
      }

      const tagName = declaration.tagName.trim();
      const existingDefinition = definitions.get(tagName);
      const definition: CemComponentDefinition = existingDefinition ?? {
        tagName,
        props: [],
        events: [],
        slots: [],
      };
      const propsByName = new Map(
        definition.props.map((prop) => [prop.name, prop] as const),
      );
      const eventsByName = new Map(
        definition.events.map((event) => [event.name, event] as const),
      );
      const slotsByName = new Map(
        definition.slots.map((slot) => [slot.name, slot] as const),
      );

      const declarationRecord = declaration as {
        attributes?: unknown;
        members?: unknown;
        events?: unknown;
        slots?: unknown;
      };

      for (const prop of readComponentPropsFromAttributes(
        declarationRecord.attributes,
      )) {
        propsByName.set(prop.name, prop);
      }

      for (const prop of readComponentPropsFromMembers(
        declarationRecord.members,
      )) {
        const existingProp = propsByName.get(prop.name);

        if (
          existingProp == null ||
          existingProp.type === 'unknown' ||
          existingProp.type.trim() === ''
        ) {
          propsByName.set(prop.name, prop);
        }
      }

      for (const event of readComponentEventsFromDeclaration(
        declarationRecord.events,
      )) {
        if (!eventsByName.has(event.name)) {
          eventsByName.set(event.name, event);
        }
      }

      for (const slot of readComponentSlotsFromDeclaration(
        declarationRecord.slots,
      )) {
        if (!slotsByName.has(slot.name)) {
          slotsByName.set(slot.name, slot);
        }
      }

      definition.props = Array.from(propsByName.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      definition.events = Array.from(eventsByName.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      definition.slots = Array.from(slotsByName.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      definitions.set(tagName, definition);
    }
  }

  return Array.from(definitions.values()).sort((a, b) =>
    a.tagName.localeCompare(b.tagName),
  );
}

function readComponentPropsFromAttributes(
  attributes: unknown,
): CemComponentProp[] {
  if (!Array.isArray(attributes)) {
    return [];
  }

  const props: CemComponentProp[] = [];

  for (const attribute of attributes) {
    if (typeof attribute !== 'object' || attribute === null) {
      continue;
    }

    const attributeRecord = attribute as {
      name?: unknown;
      fieldName?: unknown;
      type?: { text?: unknown };
    };
    const rawName =
      typeof attributeRecord.fieldName === 'string' &&
      attributeRecord.fieldName.trim() !== ''
        ? attributeRecord.fieldName
        : attributeRecord.name;

    if (typeof rawName !== 'string' || rawName.trim() === '') {
      continue;
    }

    props.push({
      name: rawName.trim(),
      type: normalizeCemTypeText(attributeRecord.type?.text),
      required: false,
    });
  }

  return props;
}

function readComponentPropsFromMembers(members: unknown): CemComponentProp[] {
  if (!Array.isArray(members)) {
    return [];
  }

  const props: CemComponentProp[] = [];

  for (const member of members) {
    if (typeof member !== 'object' || member === null) {
      continue;
    }

    const memberRecord = member as {
      kind?: unknown;
      name?: unknown;
      type?: { text?: unknown };
    };

    if (memberRecord.kind !== 'field') {
      continue;
    }

    if (
      typeof memberRecord.name !== 'string' ||
      memberRecord.name.trim() === ''
    ) {
      continue;
    }

    props.push({
      name: memberRecord.name.trim(),
      type: normalizeCemTypeText(memberRecord.type?.text),
      required: false,
    });
  }

  return props;
}

function readComponentEventsFromDeclaration(
  events: unknown,
): CemComponentEvent[] {
  if (!Array.isArray(events)) {
    return [];
  }

  const componentEvents: CemComponentEvent[] = [];

  for (const event of events) {
    if (typeof event !== 'object' || event === null) {
      continue;
    }

    const eventRecord = event as {
      name?: unknown;
      type?: { text?: unknown };
    };

    if (
      typeof eventRecord.name !== 'string' ||
      eventRecord.name.trim() === ''
    ) {
      continue;
    }

    componentEvents.push({
      name: eventRecord.name.trim(),
      type: normalizeCemTypeText(eventRecord.type?.text),
    });
  }

  return componentEvents;
}

function readComponentSlotsFromDeclaration(slots: unknown): CemComponentSlot[] {
  if (!Array.isArray(slots)) {
    return [];
  }

  const componentSlots: CemComponentSlot[] = [];

  for (const slot of slots) {
    if (typeof slot !== 'object' || slot === null) {
      continue;
    }

    const slotRecord = slot as {
      name?: unknown;
    };

    if (typeof slotRecord.name !== 'string' || slotRecord.name.trim() === '') {
      continue;
    }

    componentSlots.push({
      name: slotRecord.name.trim(),
    });
  }

  return componentSlots;
}

function normalizeCemTypeText(typeText: unknown): string {
  return typeof typeText === 'string' && typeText.trim() !== ''
    ? typeText.trim()
    : 'unknown';
}

function renderGeneratedIndex(
  projectId: string,
  componentTags: string[],
): string {
  const exportLines = componentTags.map(
    (componentTag) =>
      `export { ${toWrapperName(componentTag)} } from './${componentTag}';`,
  );

  return [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    `export const generatedComponentTags = ${JSON.stringify(componentTags)} as const;`,
    ...exportLines,
    '',
  ].join('\n');
}

function renderComponentWrapper(input: {
  projectId: string;
  componentDefinition: CemComponentDefinition;
  adapterId: string | null;
  ssrAvailable: boolean;
  ssrMarkup: string | null;
}): string {
  const { projectId, componentDefinition, adapterId, ssrAvailable, ssrMarkup } =
    input;
  const { tagName: componentTag } = componentDefinition;
  const wrapperName = toWrapperName(componentTag);

  if (adapterId === 'stencil') {
    return renderStencilComponentWrapper(
      projectId,
      componentDefinition,
      ssrAvailable,
    );
  }

  const lines = [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    `export const ${wrapperName} = ${JSON.stringify(componentTag)} as const;`,
  ];

  if (ssrMarkup != null) {
    lines.push(
      `export const ${wrapperName}SsrHtml = ${JSON.stringify(ssrMarkup)} as const;`,
    );
  }

  lines.push('');

  return lines.join('\n');
}

function renderStencilComponentWrapper(
  projectId: string,
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
    `// Generated by @qwik-custom-elements/core. Project: ${projectId}.`,
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

function renderAdapterSsrMarkup(
  adapterModule: Record<string, unknown>,
  componentTag: string,
  ssrAvailable: boolean,
): string | null {
  if (!ssrAvailable) {
    return null;
  }

  const renderComponentSsrHtmlFn =
    adapterModule != null &&
    typeof adapterModule.renderComponentSsrHtml === 'function'
      ? (adapterModule.renderComponentSsrHtml as (options: {
          tagName: string;
        }) => unknown)
      : undefined;

  if (renderComponentSsrHtmlFn == null) {
    return null;
  }

  const renderedMarkup = renderComponentSsrHtmlFn({ tagName: componentTag });

  return typeof renderedMarkup === 'string' ? renderedMarkup : null;
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

function resolveAdapterId(
  adapterModule: Record<string, unknown>,
): string | null {
  const metadata =
    'metadata' in adapterModule &&
    typeof adapterModule.metadata === 'object' &&
    adapterModule.metadata !== null
      ? (adapterModule.metadata as { adapterId?: unknown })
      : undefined;

  return typeof metadata?.adapterId === 'string' ? metadata.adapterId : null;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
