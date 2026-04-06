import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ConfigValidationError, loadGeneratorConfig } from './config.js';
import { GenerationError, generateFromConfig } from './generator.js';
import type { CliArgs, GenerationResult, RunSummary } from './types.js';

const RUN_SUMMARY_SCHEMA_VERSION = '1.0.0';
const DEFAULT_RUN_SUMMARY_PATH = './generated-run-summary.json';

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

async function writeRunSummaryArtifact(params: {
  configPath: string;
  summaryPath?: string;
  generationResult: GenerationResult;
  runStartedAtMs: number;
  runFinishedAtMs: number;
}): Promise<void> {
  const { configPath, summaryPath, generationResult, runStartedAtMs, runFinishedAtMs } =
    params;
  const configDir = path.dirname(configPath);
  const resolvedSummaryPath = path.resolve(
    configDir,
    summaryPath ?? DEFAULT_RUN_SUMMARY_PATH,
  );

  const observedErrorCodes: string[] = [];
  const summary: RunSummary = {
    schemaVersion: RUN_SUMMARY_SCHEMA_VERSION,
    startedAt: new Date(runStartedAtMs).toISOString(),
    finishedAt: new Date(runFinishedAtMs).toISOString(),
    dryRun: generationResult.dryRun,
    projects: generationResult.projects.map((project) => ({
      projectId: project.projectId,
      status: project.status,
      durationMs: project.durationMs,
      generatedIndexPath: project.generatedIndexPath,
      observedErrorCodes: [],
    })),
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
