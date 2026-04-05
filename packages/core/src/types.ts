export interface GeneratorProject {
  id: string;
  adapter: string;
  adapterPackage: string;
  source: string;
  outDir: string;
  cleanOutput?: boolean;
  adapterOptions?: Record<string, unknown>;
}

export interface GeneratorConfig {
  projects: GeneratorProject[];
  dryRun?: boolean;
  parallel?: boolean;
  format?: boolean;
  summaryPath?: string;
}

export interface CliArgs {
  configPath?: string;
  projectIds: string[];
  help: boolean;
}

export interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
}

export interface LoadedConfig {
  configPath: string;
  config: GeneratorConfig;
}

export interface PlannedWrite {
  path: string;
  content: string;
}

export interface GenerationProjectResult {
  projectId: string;
  sourcePath: string;
  outDirPath: string;
  componentTags: string[];
  plannedWrites: PlannedWrite[];
  wroteFiles: boolean;
}

export interface GenerationResult {
  dryRun: boolean;
  projects: GenerationProjectResult[];
}

export interface GenerateOptions {
  cwd?: string;
  targetProjectIds?: string[];
}
