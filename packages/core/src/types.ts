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
  parallel: boolean;
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
  status: 'success';
  durationMs: number;
  sourcePath: string;
  outDirPath: string;
  generatedIndexPath: string;
  componentTags: string[];
  plannedWrites: PlannedWrite[];
  wroteFiles: boolean;
}

export interface RunSummaryProject {
  projectId: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  generatedIndexPath: string;
  observedErrorCodes: string[];
}

export interface RunSummary {
  schemaVersion: string;
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  projects: RunSummaryProject[];
  observedErrorCodes: string[];
}

export interface GenerationResult {
  dryRun: boolean;
  projects: GenerationProjectResult[];
}

export interface GenerateOptions {
  cwd?: string;
  targetProjectIds?: string[];
}
