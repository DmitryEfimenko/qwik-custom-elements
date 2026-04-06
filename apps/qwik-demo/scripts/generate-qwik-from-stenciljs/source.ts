import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type { GeneratorConfig, ResolvedStencilSource } from './types';

const require = createRequire(import.meta.url);

function panicSource(message: string): never {
  throw new Error(`Invalid Stencil source: ${message}`);
}

function ensureDirectory(path: string, description: string): void {
  if (!existsSync(path)) {
    panicSource(`${description} does not exist at ${path}.`);
  }

  const stats = statSync(path);
  if (!stats.isDirectory()) {
    panicSource(`${description} must be a directory, but got ${path}.`);
  }
}

function ensureRequiredArtifact(
  sourceRoot: string,
  relativePath: string,
): string {
  const artifactPath = resolve(sourceRoot, relativePath);
  if (!existsSync(artifactPath)) {
    panicSource(
      `Missing required artifact ${relativePath} at ${artifactPath}. Build the Stencil library first (for example, run its build script).`,
    );
  }

  return artifactPath;
}

function resolveSourceRoot(config: GeneratorConfig): {
  sourceRoot: string;
  packageName?: string;
} {
  if (config.stencilPath) {
    const resolvedPath = resolve(process.cwd(), config.stencilPath);
    ensureDirectory(resolvedPath, 'Configured stencilPath');

    return {
      sourceRoot: resolvedPath,
      packageName: config.packageName,
    };
  }

  if (config.packageName) {
    let packageJsonPath: string;
    try {
      packageJsonPath = require.resolve(`${config.packageName}/package.json`, {
        paths: [process.cwd()],
      });
    } catch {
      panicSource(
        `Unable to resolve packageName "${config.packageName}" from ${process.cwd()}. Install or link the package, or use stencilPath instead.`,
      );
    }

    const sourceRoot = dirname(packageJsonPath);
    ensureDirectory(
      sourceRoot,
      `Resolved package root for ${config.packageName}`,
    );

    return {
      sourceRoot,
      packageName: config.packageName,
    };
  }

  panicSource('No source configured. Set stencilPath or packageName.');
}

export function resolveStencilSource(
  config: GeneratorConfig,
): ResolvedStencilSource {
  const source = resolveSourceRoot(config);

  const collectionManifestPath = ensureRequiredArtifact(
    source.sourceRoot,
    'dist/collection/collection-manifest.json',
  );
  const componentsTypesPath = ensureRequiredArtifact(
    source.sourceRoot,
    'dist/types/components.d.ts',
  );

  return {
    sourceRoot: source.sourceRoot,
    packageName: source.packageName,
    collectionManifestPath,
    componentsTypesPath,
  };
}
