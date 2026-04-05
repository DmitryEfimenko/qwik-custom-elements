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
