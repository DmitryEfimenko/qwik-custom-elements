export type ImportMode = 'demo' | 'package';

export type ProviderKind =
  | 'custom-elements-manifest'
  | 'docs-json'
  | 'dist-fallback';

export interface GeneratorConfig {
  outDir: string;
  importMode: ImportMode;
  stencilPath?: string;
  packageName?: string;
  cleanOutput: boolean;
  runtimeImports?: RuntimeImportOverrides;
}

export interface RuntimeImportOverrides {
  demoDefineCustomElements?: string;
  demoRenderToString?: string;
  packageLoader?: string;
  packageHydrate?: string;
}

export interface GeneratorCliOptions {
  configPath?: string;
  outDir?: string;
  importMode?: ImportMode;
  stencilPath?: string;
  packageName?: string;
  cleanOutput?: boolean;
}

export interface ResolvedStencilSource {
  sourceRoot: string;
  packageName?: string;
  collectionManifestPath: string;
  componentsTypesPath: string;
}

export interface MetadataComponent {
  componentName: string;
  tagName: string;
  props: MetadataProp[];
  namedSlots: string[];
  hasDefaultSlot: boolean;
  events: MetadataEvent[];
  methods: MetadataMethod[];
}

export interface MetadataProp {
  name: string;
  type: string;
  required: boolean;
  reflect?: boolean;
  defaultValue?: string;
}

export interface MetadataEvent {
  name: string;
  detailType?: string;
}

export interface MetadataMethod {
  name: string;
  signature: string;
}

export interface NormalizedMetadata {
  provider: ProviderKind;
  components: MetadataComponent[];
  sourceRoot: string;
  provenance: MetadataProvenance;
}

export interface MetadataProvenance {
  metadataProvider: ProviderKind;
  sourceRoot: string;
  slotFallbackApplied: boolean;
}

export interface GenerateContext {
  config: GeneratorConfig;
  source: ResolvedStencilSource;
}
