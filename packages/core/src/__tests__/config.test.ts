import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
  source: './custom-elements.json',
  outDir: './src/generated',
};

describe('loadGeneratorConfig', () => {
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
                source: './custom-elements.json',
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
                  source: validSourcePath,
                  outDir: './generated-a',
                },
                {
                  id: 'b-project',
                  adapter: 'stencil',
                  adapterPackage: '@qwik-custom-elements/adapter-stencil',
                  source: missingSourcePath,
                  outDir: './generated-b',
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
});
