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

  const sourcePath = resolveProjectSourcePath(project.id, project.source, cwd);
  const outDirPath = path.resolve(cwd, project.outDir);
  const componentTags = await readComponentTagsFromCem(sourcePath);
  const adapterSsrCapabilities = resolveAdapterSsrCapabilities(adapterModule);
  const ssrProbe = await probeProjectSsrAvailability(project, adapterModule);
  const plannedWrites = createPlannedWrites(
    project.id,
    outDirPath,
    componentTags,
    adapterModule,
    ssrProbe.available,
  );
  const observedErrorCodes: string[] = [];

  if (!ssrProbe.available) {
    observedErrorCodes.push(SSR_UNSUPPORTED_FALLBACK_CODE);
  }

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
    adapterOptions: project.adapterOptions ?? {},
  })) as { available?: unknown };

  if (probeResult != null && probeResult.available === true) {
    return { available: true };
  }

  return { available: false };
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
  componentTags: string[],
  adapterModule: Record<string, unknown>,
  ssrAvailable: boolean,
): Array<{ path: string; content: string }> {
  const wrapperWrites = componentTags.map((componentTag) => ({
    path: path.join(outDirPath, `${componentTag}.ts`),
    content: renderComponentWrapper(
      projectId,
      componentTag,
      renderAdapterSsrMarkup(adapterModule, componentTag, ssrAvailable),
    ),
  }));

  return [
    {
      path: path.join(outDirPath, 'index.ts'),
      content: renderGeneratedIndex(projectId, componentTags),
    },
    ...wrapperWrites,
  ];
}

async function readComponentTagsFromCem(sourcePath: string): Promise<string[]> {
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

  const tags = new Set<string>();

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

      tags.add(declaration.tagName.trim());
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
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

function renderComponentWrapper(
  projectId: string,
  componentTag: string,
  ssrMarkup: string | null,
): string {
  const wrapperName = toWrapperName(componentTag);
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
