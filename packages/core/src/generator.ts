import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  GenerateOptions,
  GenerationProjectResult,
  GenerationResult,
  GeneratorConfig,
  GeneratorProject,
} from './types.js';

export class GenerationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
  }
}

export async function generateFromConfig(
  config: GeneratorConfig,
  options: GenerateOptions = {},
): Promise<GenerationResult> {
  const cwd = options.cwd ?? process.cwd();
  const requestedProjectIds = options.targetProjectIds ?? [];
  const requestedProjectIdSet = new Set(requestedProjectIds);

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
      ? config.projects
      : config.projects.filter((project) =>
          requestedProjectIdSet.has(project.id),
        );
  const sortedProjects = [...filteredProjects].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  if (sortedProjects.length !== 1) {
    throw new GenerationError(
      'QCE_GENERATION_UNSUPPORTED',
      'Current generator slice supports exactly one project.',
    );
  }

  const projectResults: GenerationProjectResult[] = [];

  for (const project of sortedProjects) {
    const result = await generateProject(project, cwd, config.dryRun === true);
    projectResults.push(result);
  }

  return {
    dryRun: config.dryRun === true,
    projects: projectResults,
  };
}

async function generateProject(
  project: GeneratorProject,
  cwd: string,
  dryRun: boolean,
): Promise<GenerationProjectResult> {
  const sourcePath = path.resolve(cwd, project.source);
  const outDirPath = path.resolve(cwd, project.outDir);
  const componentTags = await readComponentTagsFromCem(sourcePath);
  const plannedWrites = createPlannedWrites(
    project.id,
    outDirPath,
    componentTags,
  );

  if (!dryRun) {
    await mkdir(outDirPath, { recursive: true });
    for (const plannedWrite of plannedWrites) {
      await writeFile(plannedWrite.path, plannedWrite.content, 'utf8');
    }
  }

  return {
    projectId: project.id,
    sourcePath,
    outDirPath,
    componentTags,
    plannedWrites,
    wroteFiles: !dryRun,
  };
}

function createPlannedWrites(
  projectId: string,
  outDirPath: string,
  componentTags: string[],
): Array<{ path: string; content: string }> {
  const wrapperWrites = componentTags.map((componentTag) => ({
    path: path.join(outDirPath, `${componentTag}.ts`),
    content: renderComponentWrapper(projectId, componentTag),
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
): string {
  return [
    `// Generated by @qwik-custom-elements/core. Project: ${projectId}.`,
    '// Do not edit this file directly. Use a manual extension layer.',
    '',
    `export const ${toWrapperName(componentTag)} = ${JSON.stringify(componentTag)} as const;`,
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
