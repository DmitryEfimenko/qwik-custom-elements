import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCliArgs, runCli } from '../cli.js';
import { ConfigValidationError, loadGeneratorConfig } from '../config.js';
async function withTempDir(
  run: (tempDir: string) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'qce-core-'));
  try {
    await run(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
const validProject = {
  id: 'demo',
  adapter: 'stencil',
  adapterPackage: '@qwik-custom-elements/adapter-stencil',
  source: { type: 'CEM', path: './custom-elements.json' },
  outDir: './src/generated',
};

const validStencilAdapterOptions = {
  runtime: {
    loaderImport: '@acme/stencil-lib/loader',
  },
};
describe('loadGeneratorConfig', () => {
  it('rejects legacy string source contract', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'qwik-custom-elements.config.json');
      await writeFile(
        configPath,
        JSON.stringify(
          {
            projects: [
              {
                id: 'demo',
                adapter: 'stencil',
                adapterPackage: '@qwik-custom-elements/adapter-stencil',
                source: './custom-elements.json',
                outDir: './src/generated',
              },
            ],
          },
          null,
          2,
        ),
        'utf8',
      );

      await expect(loadGeneratorConfig({ cwd: tempDir })).rejects.toMatchObject(
        {
          code: 'QCE_CONFIG_INVALID_TYPE',
          message:
            'Config field "projects[0].source" must be a source object with a valid "type" discriminator.',
        },
      );
    });
  });

  it('supports discriminated CEM source object contract', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'qwik-custom-elements.config.json');
      await writeFile(
        configPath,
        JSON.stringify(
          {
            projects: [
              {
                ...validProject,
                source: { type: 'CEM', path: './custom-elements.json' },
              },
            ],
          },
          null,
          2,
        ),
        'utf8',
      );
      const loaded = await loadGeneratorConfig({ cwd: tempDir });
      expect(loaded.config.projects[0].source).toEqual({
        type: 'CEM',
        path: './custom-elements.json',
      });
    });
  });
  it('keeps adapterOptions opaque during config loading', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'qwik-custom-elements.config.json');
      await writeFile(
        configPath,
        JSON.stringify(
          {
            projects: [
              {
                ...validProject,
                source: { type: 'CEM', path: './custom-elements.json' },
                adapterOptions: {
                  runtime: {
                    hydrateImport: '@acme/stencil-lib/hydrate',
                  },
                  customFlag: true,
                },
              },
            ],
          },
          null,
          2,
        ),
        'utf8',
      );

      const loaded = await loadGeneratorConfig({ cwd: tempDir });
      expect(loaded.config.projects[0].adapterOptions).toEqual({
        runtime: {
          hydrateImport: '@acme/stencil-lib/hydrate',
        },
        customFlag: true,
      });
    });
  });
  it('loads default JSON config path', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'qwik-custom-elements.config.json');
      await writeFile(
        configPath,
        JSON.stringify({ projects: [validProject] }, null, 2),
        'utf8',
      );
      const loaded = await loadGeneratorConfig({ cwd: tempDir });
      expect(loaded.configPath).toBe(configPath);
      expect(loaded.config.projects).toHaveLength(1);
      expect(loaded.config.projects[0].id).toBe('demo');
    });
  });
  it('supports optional JS config variant', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'custom.config.js');
      await writeFile(
        configPath,
        `export default { projects: [${JSON.stringify(validProject)}] };`,
        'utf8',
      );
      const loaded = await loadGeneratorConfig({
        cwd: tempDir,
        configPath: './custom.config.js',
      });
      expect(loaded.config.projects[0].adapter).toBe('stencil');
    });
  });
  it('fails fast with deterministic unknown-field error', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'qwik-custom-elements.config.json');
      await writeFile(
        configPath,
        JSON.stringify(
          { projects: [validProject], unknownRootField: true },
          null,
          2,
        ),
        'utf8',
      );
      await expect(loadGeneratorConfig({ cwd: tempDir })).rejects.toMatchObject(
        {
          code: 'QCE_CONFIG_UNKNOWN_FIELD',
          message: 'Unknown config field "root.unknownRootField".',
        },
      );
    });
  });
  it('fails fast when required project fields are missing', async () => {
    await withTempDir(async (tempDir) => {
      const configPath = path.join(tempDir, 'qwik-custom-elements.config.json');
      await writeFile(
        configPath,
        JSON.stringify(
          {
            projects: [
              {
                id: 'demo',
                adapter: 'stencil',
                adapterPackage: '@qwik-custom-elements/adapter-stencil',
                source: { type: 'CEM', path: './custom-elements.json' },
              },
            ],
          },
          null,
          2,
        ),
        'utf8',
      );
      await expect(loadGeneratorConfig({ cwd: tempDir })).rejects.toMatchObject(
        {
          code: 'QCE_CONFIG_MISSING_REQUIRED',
          message:
            'Config field "projects[0].outDir" must be a non-empty string.',
        },
      );
    });
  });
});
describe('parseCliArgs', () => {
  it('parses --config and --help', () => {
    expect(parseCliArgs(['--config', './some.config.js', '--help'])).toEqual({
      configPath: './some.config.js',
      projectIds: [],
      parallel: false,
      help: true,
    });
  });
  it('parses repeated --project flags in deterministic order', () => {
    expect(
      parseCliArgs([
        '--project',
        'demo',
        '--project=stencil',
        '--project',
        'lit',
      ]),
    ).toEqual({
      configPath: undefined,
      projectIds: ['demo', 'stencil', 'lit'],
      parallel: false,
      help: false,
    });
  });
  it('parses --parallel as an explicit mode flag', () => {
    expect(parseCliArgs(['--project', 'demo', '--parallel'])).toEqual({
      configPath: undefined,
      projectIds: ['demo'],
      parallel: true,
      help: false,
    });
  });
  it('throws deterministic error for unknown args', () => {
    expect(() => parseCliArgs(['--wat'])).toThrowError(ConfigValidationError);
    expect(() => parseCliArgs(['--wat'])).toThrowError(
      'Unknown CLI argument "--wat".',
    );
  });
});
describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('returns non-zero when one project fails in a multi-project run', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const validSourcePath = './custom-elements-valid.json';
        const missingSourcePath = './custom-elements-missing.json';
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        await writeFile(
          validSourcePath,
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'app-root' }] }],
          }),
          'utf8',
        );
        await writeFile(
          configPath,
          JSON.stringify(
            {
              projects: [
                {
                  id: 'a-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: validSourcePath },
                  outDir: './generated-a',
                  adapterOptions: validStencilAdapterOptions,
                },
                {
                  id: 'b-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: missingSourcePath },
                  outDir: './generated-b',
                  adapterOptions: validStencilAdapterOptions,
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        const stderrSpy = vi
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true);
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exitCode = await runCli(['--config', configPath]);
        expect(exitCode).toBe(1);
        expect(stderrSpy).toHaveBeenCalledWith(
          expect.stringContaining('QCE_CEM_READ_FAILED'),
        );
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
  it('writes run summary artifact with observed error codes on failed runs', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        const summaryPath = path.join(tempDir, 'summary', 'run-summary.json');
        await writeFile(
          configPath,
          JSON.stringify(
            {
              dryRun: true,
              summaryPath: './summary/run-summary.json',
              projects: [
                {
                  id: 'broken-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: {
                    type: 'CEM',
                    path: './custom-elements-missing.json',
                  },
                  outDir: './generated/broken',
                  adapterOptions: validStencilAdapterOptions,
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitCode = await runCli(['--config', configPath]);
        const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as {
          observedErrorCodes: string[];
          projects: Array<{
            projectId: string;
            status: string;
            durationMs: number;
            generatedIndexPath: string;
            ssrCapabilities: {
              available: boolean;
              supportsSsrProbe: boolean;
              ssrRuntimeSubpath: string | null;
            };
            observedErrorCodes: string[];
          }>;
          dryRun: boolean;
        };
        expect(exitCode).toBe(1);
        expect(summary.dryRun).toBe(true);
        expect(summary.projects).toHaveLength(1);
        expect(summary.projects[0].projectId).toBe('broken-project');
        expect(summary.projects[0].status).toBe('failed');
        expect(summary.projects[0].durationMs).toBeGreaterThanOrEqual(0);
        expect(summary.projects[0].generatedIndexPath).toBe('');
        expect(summary.projects[0].ssrCapabilities).toEqual({
          available: false,
          supportsSsrProbe: false,
          ssrRuntimeSubpath: null,
        });
        expect(summary.projects[0].observedErrorCodes).toEqual([
          'QCE_CEM_READ_FAILED',
        ]);
        expect(summary.observedErrorCodes).toEqual(['QCE_CEM_READ_FAILED']);
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
  it('emits deterministic warning when adapter SSR falls back to CEM-only', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        await writeFile(
          './custom-elements.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'app-root' }] }],
          }),
          'utf8',
        );
        await writeFile(
          './adapter-unsupported.mjs',
          [
            'export async function probeSSR() {',
            '  return { available: false };',
            '}',
            '',
            'export function createGeneratedOutput() {',
            '  return [];',
            '}',
            '',
          ].join('\n'),
          'utf8',
        );
        await writeFile(
          configPath,
          JSON.stringify(
            {
              dryRun: true,
              projects: [
                {
                  id: 'demo',
                  adapter: 'stencil',
                  adapterPackage: './adapter-unsupported.mjs',
                  source: { type: 'CEM', path: './custom-elements.json' },
                  outDir: './generated/demo',
                  adapterOptions: validStencilAdapterOptions,
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const stderrSpy = vi
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true);
        const exitCode = await runCli(['--config', configPath]);
        expect(exitCode).toBe(0);
        expect(stderrSpy).toHaveBeenCalledWith(
          expect.stringContaining('QCE_SSR_UNSUPPORTED_FALLBACK'),
        );
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
  it('emits deterministic loader-only success diagnostics when hydrate runtime is unavailable', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        const summaryPath = path.join(tempDir, 'generated-run-summary.json');
        await writeFile(
          './custom-elements.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'app-root' }] }],
          }),
          'utf8',
        );
        await writeFile(
          './adapter-loader-only.mjs',
          [
            'export async function resolveRuntimeImports() {',
            '  return {',
            "    runtimeImports: { loaderImport: '@acme/stencil-lib/loader' },",
            "    observedErrorCodes: ['QCE_STENCIL_RUNTIME_HYDRATE_RESOLVE_FAILED'],",
            '  };',
            '}',
            '',
            'export async function probeSSR() {',
            '  return { available: false };',
            '}',
            '',
            'export function createGeneratedOutput() {',
            '  return [{ relativePath: "runtime-csr.generated.ts", content: "export {};" }];',
            '}',
            '',
          ].join('\n'),
          'utf8',
        );
        await writeFile(
          configPath,
          JSON.stringify(
            {
              dryRun: true,
              projects: [
                {
                  id: 'loader-only-demo',
                  adapter: 'stencil',
                  adapterPackage: './adapter-loader-only.mjs',
                  source: { type: 'CEM', path: './custom-elements.json' },
                  outDir: './generated/demo',
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const stderrSpy = vi
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true);
        const exitCode = await runCli(['--config', configPath]);
        const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as {
          projects: Array<{
            ssrCapabilities: {
              available: boolean;
              supportsSsrProbe: boolean;
              ssrRuntimeSubpath: string | null;
              loaderOnlyMode?: boolean;
            };
          }>;
        };

        expect(exitCode).toBe(0);
        expect(stderrSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'SSR is unavailable, but client-capable wrapper generation succeeded',
          ),
        );
        expect(summary.projects[0].ssrCapabilities).toEqual({
          available: false,
          supportsSsrProbe: false,
          ssrRuntimeSubpath: null,
          loaderOnlyMode: true,
        });
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
  it('prints buffered per-project logs in deterministic id order for parallel runs', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        await writeFile(
          './custom-elements-a.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'alpha-card' }] }],
          }),
          'utf8',
        );
        await writeFile(
          './custom-elements-z.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'zeta-card' }] }],
          }),
          'utf8',
        );
        await writeFile(
          configPath,
          JSON.stringify(
            {
              parallel: true,
              dryRun: true,
              projects: [
                {
                  id: 'z-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: './custom-elements-z.json' },
                  outDir: './generated/z',
                  adapterOptions: validStencilAdapterOptions,
                },
                {
                  id: 'a-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: './custom-elements-a.json' },
                  outDir: './generated/a',
                  adapterOptions: validStencilAdapterOptions,
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        const stdoutSpy = vi
          .spyOn(process.stdout, 'write')
          .mockImplementation(() => true);
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitCode = await runCli(['--config', configPath]);
        expect(exitCode).toBe(0);
        const output = stdoutSpy.mock.calls.map(([chunk]) => String(chunk));
        const aProjectLineIndex = output.findIndex((line) =>
          line.includes('[project:a-project]'),
        );
        const zProjectLineIndex = output.findIndex((line) =>
          line.includes('[project:z-project]'),
        );
        const summaryLineIndex = output.findIndex((line) =>
          line.includes('Generation completed (dry-run)'),
        );
        expect(aProjectLineIndex).toBeGreaterThanOrEqual(0);
        expect(zProjectLineIndex).toBeGreaterThanOrEqual(0);
        expect(aProjectLineIndex).toBeLessThan(zProjectLineIndex);
        expect(summaryLineIndex).toBeGreaterThan(zProjectLineIndex);
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
  it('writes run summary artifact with required baseline fields', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        const summaryPath = path.join(tempDir, 'generated-run-summary.json');
        await writeFile(
          './custom-elements-a.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'alpha-card' }] }],
          }),
          'utf8',
        );
        await writeFile(
          './custom-elements-z.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'zeta-card' }] }],
          }),
          'utf8',
        );
        await writeFile(
          configPath,
          JSON.stringify(
            {
              dryRun: true,
              projects: [
                {
                  id: 'z-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: './custom-elements-z.json' },
                  outDir: './generated/z',
                  adapterOptions: validStencilAdapterOptions,
                },
                {
                  id: 'a-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: './custom-elements-a.json' },
                  outDir: './generated/a',
                  adapterOptions: validStencilAdapterOptions,
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitCode = await runCli(['--config', configPath]);
        const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as {
          schemaVersion: string;
          startedAt: string;
          finishedAt: string;
          dryRun: boolean;
          projects: Array<{
            projectId: string;
            status: string;
            durationMs: number;
            generatedIndexPath: string;
            ssrCapabilities: {
              available: boolean;
              supportsSsrProbe: boolean;
              ssrRuntimeSubpath: string | null;
            };
            observedErrorCodes: string[];
            resolvedCoreVersion: string;
            resolvedAdapterVersion: string;
          }>;
          observedErrorCodes: string[];
        };
        expect(exitCode).toBe(0);
        expect(summary.schemaVersion).toBe('1.0.0');
        expect(summary.startedAt).toMatch(/T/);
        expect(summary.finishedAt).toMatch(/T/);
        expect(summary.dryRun).toBe(true);
        expect(summary.observedErrorCodes).toEqual([]);
        expect(summary.projects.map((project) => project.projectId)).toEqual([
          'a-project',
          'z-project',
        ]);
        expect(summary.projects[0].status).toBe('success');
        expect(summary.projects[1].status).toBe('success');
        expect(summary.projects[0].durationMs).toBeGreaterThanOrEqual(0);
        expect(summary.projects[1].durationMs).toBeGreaterThanOrEqual(0);
        expect(summary.projects[0].generatedIndexPath).toBe(
          path.join(tempDir, 'generated', 'a', 'index.ts'),
        );
        expect(summary.projects[1].generatedIndexPath).toBe(
          path.join(tempDir, 'generated', 'z', 'index.ts'),
        );
        expect(summary.projects[0].observedErrorCodes).toEqual([
          'QCE_SSR_UNSUPPORTED_FALLBACK',
        ]);
        expect(summary.projects[1].observedErrorCodes).toEqual([
          'QCE_SSR_UNSUPPORTED_FALLBACK',
        ]);
        expect(summary.projects[0].ssrCapabilities).toEqual({
          available: false,
          supportsSsrProbe: true,
          ssrRuntimeSubpath: './ssr',
        });
        expect(summary.projects[1].ssrCapabilities).toEqual({
          available: false,
          supportsSsrProbe: true,
          ssrRuntimeSubpath: './ssr',
        });
        expect(summary.projects[0].resolvedCoreVersion).toBe('0.0.0');
        expect(summary.projects[1].resolvedCoreVersion).toBe('0.0.0');
        expect(summary.projects[0].resolvedAdapterVersion).toBe('0.0.0');
        expect(summary.projects[1].resolvedAdapterVersion).toBe('0.0.0');
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
  it('marks non-targeted projects as skipped in summary output', async () => {
    await withTempDir(async (tempDir) => {
      const previousCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const configPath = path.join(
          tempDir,
          'qwik-custom-elements.config.json',
        );
        const summaryPath = path.join(tempDir, 'generated-run-summary.json');
        await writeFile(
          './custom-elements-a.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'alpha-card' }] }],
          }),
          'utf8',
        );
        await writeFile(
          './custom-elements-z.json',
          JSON.stringify({
            modules: [{ declarations: [{ tagName: 'zeta-card' }] }],
          }),
          'utf8',
        );
        await writeFile(
          configPath,
          JSON.stringify(
            {
              dryRun: true,
              projects: [
                {
                  id: 'z-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: './custom-elements-z.json' },
                  outDir: './generated/z',
                  adapterOptions: validStencilAdapterOptions,
                },
                {
                  id: 'a-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: { type: 'CEM', path: './custom-elements-a.json' },
                  outDir: './generated/a',
                  adapterOptions: validStencilAdapterOptions,
                },
              ],
            },
            null,
            2,
          ),
          'utf8',
        );
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const exitCode = await runCli([
          '--config',
          configPath,
          '--project',
          'a-project',
        ]);
        const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as {
          projects: Array<{
            projectId: string;
            status: string;
            durationMs: number;
            generatedIndexPath: string;
            ssrCapabilities: {
              available: boolean;
              supportsSsrProbe: boolean;
              ssrRuntimeSubpath: string | null;
            };
            observedErrorCodes: string[];
          }>;
        };
        expect(exitCode).toBe(0);
        expect(summary.projects.map((project) => project.projectId)).toEqual([
          'a-project',
          'z-project',
        ]);
        expect(summary.projects[0].status).toBe('success');
        expect(summary.projects[1].status).toBe('skipped');
        expect(summary.projects[1].durationMs).toBe(0);
        expect(summary.projects[1].generatedIndexPath).toBe(
          path.join(tempDir, 'generated', 'z', 'index.ts'),
        );
        expect(summary.projects[1].ssrCapabilities).toEqual({
          available: false,
          supportsSsrProbe: false,
          ssrRuntimeSubpath: null,
        });
        expect(summary.projects[1].observedErrorCodes).toEqual([]);
      } finally {
        process.chdir(previousCwd);
      }
    });
  });
});
