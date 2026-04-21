export interface CEMProjectSource {
  type: 'CEM';
  path: string;
}

export interface PackageNameProjectSource {
  type: 'PACKAGE_NAME';
  packageName: string;
  cemPath?: string;
}

export type GeneratorProjectSource =
  | CEMProjectSource
  | PackageNameProjectSource;

export interface GeneratorProject {
  id: string;
  adapter: string;
  adapterPackage: string;
  source: GeneratorProjectSource;
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

export interface ProjectSsrCapabilities {
  available: boolean;
  supportsSsrProbe: boolean;
  ssrRuntimeSubpath: string | null;
  clientOnlyMode?: boolean;
}

export interface GenerationProjectResult {
  projectId: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  adapterPackage: string;
  sourcePath: string;
  outDirPath: string;
  generatedIndexPath: string;
  componentTags: string[];
  plannedWrites: PlannedWrite[];
  wroteFiles: boolean;
  ssrCapabilities: ProjectSsrCapabilities;
  observedErrorCodes: string[];
}

export interface RunSummaryProject {
  projectId: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  generatedIndexPath: string;
  resolvedCoreVersion: string;
  resolvedAdapterVersion: string;
  ssrCapabilities: ProjectSsrCapabilities;
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
