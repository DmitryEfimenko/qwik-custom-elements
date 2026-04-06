import { resolve } from 'node:path';
import type { GeneratorCliOptions } from './types';

function readArgValue(args: string[], flag: string): string | undefined {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) {
    return direct.slice(flag.length + 1);
  }

  const index = args.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

export function parseCliArgs(argv: string[]): GeneratorCliOptions {
  const outDir = readArgValue(argv, '--outDir');
  const importMode = readArgValue(argv, '--importMode');
  const stencilPath = readArgValue(argv, '--stencilPath');
  const packageName = readArgValue(argv, '--packageName');
  const configPath = readArgValue(argv, '--config');

  if (
    importMode !== undefined &&
    importMode !== 'demo' &&
    importMode !== 'package'
  ) {
    throw new Error(
      `Invalid --importMode value "${importMode}". Use "demo" or "package".`,
    );
  }

  const cleanOutput =
    argv.includes('--cleanOutput') || argv.includes('--clean-output')
      ? true
      : argv.includes('--no-cleanOutput') || argv.includes('--no-clean-output')
        ? false
        : undefined;

  return {
    configPath: configPath ? resolve(process.cwd(), configPath) : undefined,
    outDir: outDir?.trim(),
    importMode,
    stencilPath,
    packageName,
    cleanOutput,
  };
}
