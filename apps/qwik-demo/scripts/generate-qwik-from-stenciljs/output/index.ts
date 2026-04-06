import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve } from 'node:path';
import type { EmittedGeneratorOutput } from '../emitters';
import type { GenerateContext } from '../types';

function resolveOutputRoot(context: GenerateContext): string {
  return resolve(process.cwd(), context.config.outDir);
}

function assertSafeOutputRoot(outRoot: string): void {
  const workspaceRoot = process.cwd();
  const rootPath = parse(outRoot).root;

  if (outRoot === rootPath) {
    throw new Error(
      `Refusing to use output directory "${outRoot}" because it resolves to a filesystem root.`,
    );
  }

  const relativeToWorkspace = relative(workspaceRoot, outRoot);
  const isWorkspaceRoot = relativeToWorkspace.length === 0;
  const isOutsideWorkspace =
    relativeToWorkspace.startsWith('..') || isAbsolute(relativeToWorkspace);

  if (isWorkspaceRoot || isOutsideWorkspace) {
    throw new Error(
      `Refusing to clean output directory "${outRoot}" because it is not a safe subdirectory of the workspace root (${workspaceRoot}).`,
    );
  }
}

function writeFileIfChanged(path: string, content: string): void {
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf-8');
    if (existing === content) {
      return;
    }
  }

  writeFileSync(path, content);
}

export function writeGeneratedOutput(
  context: GenerateContext,
  output: EmittedGeneratorOutput
): void {
  const outRoot = resolveOutputRoot(context);
  assertSafeOutputRoot(outRoot);

  if (context.config.cleanOutput) {
    rmSync(outRoot, { recursive: true, force: true });
  }

  const wrapperFiles = [...output.wrappers].sort((a, b) =>
    a.fileName.localeCompare(b.fileName),
  );

  const filesToWrite: Array<{ fileName: string; content: string }> = [
    { fileName: 'runtime.generated.ts', content: output.runtimeBootstrap },
    { fileName: 'index.ts', content: output.indexSource },
    {
      fileName: 'generation-manifest.json',
      content: output.manifestSource,
    },
    ...wrapperFiles,
  ];

  mkdirSync(outRoot, { recursive: true });

  for (const file of filesToWrite) {
    writeFileIfChanged(join(outRoot, file.fileName), file.content);
  }
}
