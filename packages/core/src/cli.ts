import { pathToFileURL } from 'node:url';

import { ConfigValidationError, loadGeneratorConfig } from './config.js';
import { GenerationError, generateFromConfig } from './generator.js';
import type { CliArgs } from './types.js';

export function parseCliArgs(argv: string[]): CliArgs {
  let configPath: string | undefined;
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

    throw new ConfigValidationError(
      'QCE_CLI_INVALID_ARG',
      `Unknown CLI argument "${arg}".`,
    );
  }

  return { configPath, help };
}

export async function runCli(argv: string[]): Promise<number> {
  try {
    const args = parseCliArgs(argv);

    if (args.help) {
      process.stdout.write(
        'Usage: qwik-custom-elements [--config <path>] [--help]\n' +
          'Default config path: ./qwik-custom-elements.config.json\n' +
          'Optional JS config path: ./qwik-custom-elements.config.js\n',
      );
      return 0;
    }

    const { configPath, config } = await loadGeneratorConfig({
      configPath: args.configPath,
    });
    const generationResult = await generateFromConfig(config);
    const mode = generationResult.dryRun ? 'dry-run' : 'write';
    const totalWrites = generationResult.projects.reduce(
      (sum, project) => sum + project.plannedWrites.length,
      0,
    );

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
