import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  GeneratorConfig,
  GeneratorProject,
  LoadConfigOptions,
  LoadedConfig,
} from './types.js';

const DEFAULT_JSON_CONFIG = 'qwik-custom-elements.config.json';
const DEFAULT_JS_CONFIG = 'qwik-custom-elements.config.js';

const ROOT_ALLOWED_KEYS = new Set([
  'projects',
  'dryRun',
  'parallel',
  'format',
  'summaryPath',
]);
const PROJECT_ALLOWED_KEYS = new Set([
  'id',
  'adapter',
  'adapterPackage',
  'source',
  'outDir',
  'cleanOutput',
  'adapterOptions',
]);

export class ConfigValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ConfigValidationError';
    this.code = code;
  }
}

export async function loadGeneratorConfig(
  options: LoadConfigOptions = {},
): Promise<LoadedConfig> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolveConfigPath(cwd, options.configPath);
  const rawConfig = await readUnknownConfigValue(configPath);
  const config = validateGeneratorConfig(rawConfig);

  return { configPath, config };
}

export function validateGeneratorConfig(rawConfig: unknown): GeneratorConfig {
  if (!isPlainObject(rawConfig)) {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_SHAPE',
      'Config must be a plain object.',
    );
  }

  ensureNoUnknownKeys(rawConfig, ROOT_ALLOWED_KEYS, 'root');

  const projects = rawConfig.projects;
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new ConfigValidationError(
      'QCE_CONFIG_MISSING_REQUIRED',
      'Config field "projects" must be a non-empty array.',
    );
  }

  const normalizedProjects = projects.map((project, index) =>
    validateProject(project, `projects[${index}]`),
  );

  const config: GeneratorConfig = {
    projects: normalizedProjects,
  };

  config.dryRun = readOptionalBoolean(rawConfig.dryRun, 'dryRun');
  config.parallel = readOptionalBoolean(rawConfig.parallel, 'parallel');
  config.format = readOptionalBoolean(rawConfig.format, 'format');
  config.summaryPath = readOptionalString(rawConfig.summaryPath, 'summaryPath');

  return config;
}

function validateProject(
  rawProject: unknown,
  pathPrefix: string,
): GeneratorProject {
  if (!isPlainObject(rawProject)) {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_SHAPE',
      `Config field "${pathPrefix}" must be a plain object.`,
    );
  }

  ensureNoUnknownKeys(rawProject, PROJECT_ALLOWED_KEYS, pathPrefix);

  return {
    id: readRequiredString(rawProject.id, `${pathPrefix}.id`),
    adapter: readRequiredString(rawProject.adapter, `${pathPrefix}.adapter`),
    adapterPackage: readRequiredString(
      rawProject.adapterPackage,
      `${pathPrefix}.adapterPackage`,
    ),
    source: readRequiredString(rawProject.source, `${pathPrefix}.source`),
    outDir: readRequiredString(rawProject.outDir, `${pathPrefix}.outDir`),
    cleanOutput: readOptionalBoolean(
      rawProject.cleanOutput,
      `${pathPrefix}.cleanOutput`,
    ),
    adapterOptions: readOptionalObject(
      rawProject.adapterOptions,
      `${pathPrefix}.adapterOptions`,
    ),
  };
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigValidationError(
      'QCE_CONFIG_MISSING_REQUIRED',
      `Config field "${field}" must be a non-empty string.`,
    );
  }

  return value;
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_TYPE',
      `Config field "${field}" must be a non-empty string when provided.`,
    );
  }

  return value;
}

function readOptionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_TYPE',
      `Config field "${field}" must be a boolean when provided.`,
    );
  }

  return value;
}

function readOptionalObject(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  if (value == null) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_TYPE',
      `Config field "${field}" must be an object when provided.`,
    );
  }

  return value;
}

function ensureNoUnknownKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  field: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new ConfigValidationError(
        'QCE_CONFIG_UNKNOWN_FIELD',
        `Unknown config field "${field}.${key}".`,
      );
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveConfigPath(cwd: string, cliConfigPath?: string): string {
  if (cliConfigPath) {
    return path.resolve(cwd, cliConfigPath);
  }

  const defaultJsonPath = path.resolve(cwd, DEFAULT_JSON_CONFIG);
  if (existsSync(defaultJsonPath)) {
    return defaultJsonPath;
  }

  const defaultJsPath = path.resolve(cwd, DEFAULT_JS_CONFIG);
  if (existsSync(defaultJsPath)) {
    return defaultJsPath;
  }

  throw new ConfigValidationError(
    'QCE_CONFIG_NOT_FOUND',
    `Could not find config file. Checked ${DEFAULT_JSON_CONFIG} and ${DEFAULT_JS_CONFIG} in ${cwd}.`,
  );
}

async function readUnknownConfigValue(configPath: string): Promise<unknown> {
  const extension = path.extname(configPath).toLowerCase();

  if (extension === '.json') {
    return readJsonConfig(configPath);
  }

  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    return readModuleConfig(configPath);
  }

  throw new ConfigValidationError(
    'QCE_CONFIG_UNSUPPORTED_EXTENSION',
    `Unsupported config extension "${extension}". Use .json, .js, .mjs, or .cjs.`,
  );
}

async function readJsonConfig(configPath: string): Promise<unknown> {
  try {
    const rawText = await readFile(configPath, 'utf8');
    return JSON.parse(rawText) as unknown;
  } catch (error) {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_JSON',
      `Invalid JSON config at ${configPath}: ${toErrorMessage(error)}`,
    );
  }
}

async function readModuleConfig(configPath: string): Promise<unknown> {
  try {
    const moduleNamespace = await import(pathToFileURL(configPath).href);
    return moduleNamespace.default ?? moduleNamespace;
  } catch (error) {
    throw new ConfigValidationError(
      'QCE_CONFIG_INVALID_MODULE',
      `Invalid JS config at ${configPath}: ${toErrorMessage(error)}`,
    );
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
