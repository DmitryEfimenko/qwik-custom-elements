import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ConfigValidationError, loadGeneratorConfig } from './config.js';
import { GenerationError, generateFromConfig } from './generator.js';
import type {
  CliArgs,
  GenerationResult,
  GeneratorProjectSource,
  RunSummary,
} from './types.js';

const RUN_SUMMARY_SCHEMA_VERSION = '1.0.0';
const DEFAULT_RUN_SUMMARY_PATH = './generated-run-summary.json';
const SSR_UNSUPPORTED_FALLBACK_CODE = 'QCE_SSR_UNSUPPORTED_FALLBACK';
const CORE_PACKAGE_JSON_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'package.json',
);

export function parseCliArgs(argv: string[]): CliArgs {
  let configPath: string | undefined;
  const projectIds: string[] = [];
  let parallel = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg === '--config') {
      const nextValue = argv[index + 1];
      if (!nextValue || nextValue.startsWith('-')) {
        throw new ConfigValidationError(
          'QCE_CLI_INVALID_ARG',
          'Flag "--config" requires a file path value.',
        );
      }

      configPath = nextValue;
      index += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      const candidate = arg.slice('--config='.length);
      if (!candidate) {
        throw new ConfigValidationError(
          'QCE_CLI_INVALID_ARG',
          'Flag "--config" requires a file path value.',
        );
      }

      configPath = candidate;
      continue;
    }

    if (arg === '--project') {
      const nextValue = argv[index + 1];
      if (!nextValue || nextValue.startsWith('-')) {
        throw new ConfigValidationError(
          'QCE_CLI_INVALID_ARG',
          'Flag "--project" requires a project id value.',
        );
      }

      projectIds.push(nextValue);
      index += 1;
      continue;
    }

    if (arg.startsWith('--project=')) {
      const candidate = arg.slice('--project='.length);
      if (!candidate) {
        throw new ConfigValidationError(
          'QCE_CLI_INVALID_ARG',
          'Flag "--project" requires a project id value.',
        );
      }

      projectIds.push(candidate);
      continue;
    }

    if (arg === '--parallel') {
      parallel = true;
      continue;
    }

    throw new ConfigValidationError(
      'QCE_CLI_INVALID_ARG',
      `Unknown CLI argument "${arg}".`,
    );
  }

  return { configPath, projectIds, parallel, help };
}

export async function runCli(argv: string[]): Promise<number> {
  const runStartedAtMs = Date.now();
  let resolvedConfigPath: string | undefined;
  let resolvedSummaryPath: string | undefined;
  let resolvedDryRun = false;
  let selectedProjectsForSummary: Array<{
    projectId: string;
    adapterPackage: string;
    sourcePath: string;
    outDirPath: string;
    isTargeted: boolean;
  }> = [];

  try {
    const args = parseCliArgs(argv);

    if (args.help) {
      process.stdout.write(
        'Usage: qwik-custom-elements [--config <path>] [--project <id>] [--parallel] [--help]\n' +
          'Default config path: ./qwik-custom-elements.config.json\n' +
          'Optional JS config path: ./qwik-custom-elements.config.js\n' +
          'Parallel mode: add --parallel to run selected projects concurrently.\n' +
          'Project targeting: repeat --project to run a subset by id.\n',
      );
      return 0;
    }

    const { configPath, config } = await loadGeneratorConfig({
      configPath: args.configPath,
    });
    resolvedConfigPath = configPath;
    resolvedSummaryPath = config.summaryPath;
    resolvedDryRun = config.dryRun === true;

    const requestedProjectIdSet = new Set(args.projectIds);
    selectedProjectsForSummary = [...config.projects]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((project) => ({
        projectId: project.id,
        adapterPackage: project.adapterPackage,
        sourcePath: resolveProjectSourceSummaryPath(project.source),
        outDirPath: path.resolve(process.cwd(), project.outDir),
        isTargeted:
          requestedProjectIdSet.size === 0 ||
          requestedProjectIdSet.has(project.id),
      }));

    if (args.parallel) {
      config.parallel = true;
    }

    const generationResult = await generateFromConfig(config, {
      targetProjectIds: args.projectIds,
    });
    const mode = generationResult.dryRun ? 'dry-run' : 'write';
    const totalWrites = generationResult.projects.reduce(
      (sum, project) => sum + project.plannedWrites.length,
      0,
    );

    if (config.parallel === true) {
      for (const project of generationResult.projects) {
        process.stdout.write(
          `[project:${project.projectId}] mode=${mode} plannedWrites=${project.plannedWrites.length}\n`,
        );
      }
    }

    for (const project of generationResult.projects) {
      if (project.observedErrorCodes.includes(SSR_UNSUPPORTED_FALLBACK_CODE)) {
        process.stderr.write(
          `${SSR_UNSUPPORTED_FALLBACK_CODE}: Project "${project.projectId}" adapter SSR is unavailable; falling back to CEM-only generation.\n`,
        );
      }
    }

    const runFinishedAtMs = Date.now();
    await writeRunSummaryArtifact({
      configPath,
      summaryPath: config.summaryPath,
      generationResult,
      runStartedAtMs,
      runFinishedAtMs,
    });

    process.stdout.write(
      `Generation completed (${mode}) from ${configPath}. Projects: ${generationResult.projects.length}. Planned writes: ${totalWrites}.\n`,
    );

    return 0;
  } catch (error) {
    if (resolvedConfigPath != null && error instanceof GenerationError) {
      const runFinishedAtMs = Date.now();
      const failedDurationMs = runFinishedAtMs - runStartedAtMs;
      await writeRunSummaryArtifact({
        configPath: resolvedConfigPath,
        summaryPath: resolvedSummaryPath,
        generationResult: {
          dryRun: resolvedDryRun,
          projects: selectedProjectsForSummary.map((project) => ({
            projectId: project.projectId,
            status: project.isTargeted ? 'failed' : 'skipped',
            durationMs: project.isTargeted ? failedDurationMs : 0,
            adapterPackage: project.adapterPackage,
            sourcePath: project.sourcePath,
            outDirPath: project.outDirPath,
            generatedIndexPath: project.isTargeted
              ? ''
              : path.join(project.outDirPath, 'index.ts'),
            componentTags: [],
            plannedWrites: [],
            wroteFiles: false,
            observedErrorCodes: project.isTargeted ? [error.code] : [],
          })),
        },
        runStartedAtMs,
        runFinishedAtMs,
        observedErrorCodes: [error.code],
      });
    }

    if (
      error instanceof ConfigValidationError ||
      error instanceof GenerationError
    ) {
      process.stderr.write(`${error.code}: ${error.message}\n`);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`QCE_UNEXPECTED: ${message}\n`);
    return 1;
  }
}

function resolveProjectSourceSummaryPath(
  source: GeneratorProjectSource,
): string {
  if (source.type === 'CEM') {
    return path.resolve(process.cwd(), source.path);
  }

  if (source.cemPath != null) {
    return path.resolve(process.cwd(), source.cemPath);
  }

  return source.packageName;
}

async function writeRunSummaryArtifact(params: {
  configPath: string;
  summaryPath?: string;
  generationResult: GenerationResult;
  runStartedAtMs: number;
  runFinishedAtMs: number;
  observedErrorCodes?: string[];
}): Promise<void> {
  const {
    configPath,
    summaryPath,
    generationResult,
    runStartedAtMs,
    runFinishedAtMs,
    observedErrorCodes = [],
  } = params;
  const configDir = path.dirname(configPath);
  const resolvedSummaryPath = path.resolve(
    configDir,
    summaryPath ?? DEFAULT_RUN_SUMMARY_PATH,
  );
  const resolvedCoreVersion = await readVersionFromPackageJson(
    CORE_PACKAGE_JSON_PATH,
  );
  const adapterVersionCache = new Map<string, string>();

  const summary: RunSummary = {
    schemaVersion: RUN_SUMMARY_SCHEMA_VERSION,
    startedAt: new Date(runStartedAtMs).toISOString(),
    finishedAt: new Date(runFinishedAtMs).toISOString(),
    dryRun: generationResult.dryRun,
    projects: await Promise.all(
      generationResult.projects.map(async (project) => ({
        projectId: project.projectId,
        status: project.status,
        durationMs: project.durationMs,
        generatedIndexPath: project.generatedIndexPath,
        resolvedCoreVersion,
        resolvedAdapterVersion: await resolveAdapterVersion(
          project.adapterPackage,
          adapterVersionCache,
        ),
        observedErrorCodes: Array.from(
          new Set(project.observedErrorCodes),
        ).sort((a, b) => a.localeCompare(b)),
      })),
    ),
    observedErrorCodes: Array.from(new Set(observedErrorCodes)).sort((a, b) =>
      a.localeCompare(b),
    ),
  };

  await mkdir(path.dirname(resolvedSummaryPath), { recursive: true });
  await writeFile(
    resolvedSummaryPath,
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  );
}

async function resolveAdapterVersion(
  adapterPackage: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(adapterPackage);
  if (cached != null) {
    return cached;
  }

  const packageNameSegments = adapterPackage.split('/');
  const packageDirectoryName = packageNameSegments.at(-1);

  if (!packageDirectoryName) {
    cache.set(adapterPackage, 'unknown');
    return 'unknown';
  }

  const adapterPackageJsonPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    packageDirectoryName,
    'package.json',
  );

  const resolvedVersion = await readVersionFromPackageJson(
    adapterPackageJsonPath,
  );
  cache.set(adapterPackage, resolvedVersion);
  return resolvedVersion;
}

async function readVersionFromPackageJson(
  packageJsonPath: string,
): Promise<string> {
  try {
    const packageJsonText = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonText) as Record<string, unknown>;
    if (
      packageJson != null &&
      typeof packageJson.version === 'string' &&
      packageJson.version.length > 0
    ) {
      return packageJson.version;
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function isMainModule(): boolean {
  const executedPath = process.argv[1];
  if (!executedPath) {
    return false;
  }

  return import.meta.url === pathToFileURL(executedPath).href;
}

if (isMainModule()) {
  runCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`QCE_UNEXPECTED: ${message}\n`);
      process.exitCode = 1;
    });
}
