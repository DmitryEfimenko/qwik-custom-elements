# Core and Adapter Interface Design (Child #3)

Date: 2026-04-05  
Parent PRD: #1  
Child issue: #3

## Goal

Define core and adapter contracts before implementation so the first CLI slice can be built without reworking package boundaries.

## Fixed constraints carried into the design

- Core owns wrapper generation APIs and CLI orchestration.
- Adapters own runtime integration and metadata enrichment only.
- Adapters do not expose a generator API.
- Adapter subpaths are allowed, including `adapter-lit/ssr` and `/metadata`.
- If SSR is unavailable for a project, generation falls back to CEM-only and emits a deterministic warning.

## Option A: Minimal Core API

This option centers on one public core method for almost all callers.

```ts
interface GenerateOptions {
  projects: ProjectConfig[];
  dryRun?: boolean;
  parallel?: boolean;
  format?: boolean;
}

interface CoreGenerator {
  generate(options: GenerateOptions): Promise<RunSummary>;
}

interface AdapterContract {
  metadata: AdapterMetadata;
  canHandle(cem: CustomElementsManifest): boolean;
  transform(input: AdapterTransformInput): Promise<AdapterTransformOutput>;
}
```

Strengths: smallest learning surface and clear default path.  
Trade-off: all workflows must be expressed through one method, so advanced planning hooks are hidden.

## Option B: Capability-Driven Plugin Model

This option optimizes for extensibility and future adapter diversity.

```ts
interface AdapterMetadata {
  name: string;
  version: string;
  capabilities: {
    ssr?: { available: boolean; subpath?: string; probe?: string };
    metadata?: { available: boolean; subpath?: string };
  };
}

interface Adapter {
  metadata: AdapterMetadata;
  transform(input: AdapterTransformInput): Promise<AdapterTransformOutput>;
}

interface CoreRunner {
  generate(config: GeneratorConfig): Promise<RunSummary>;
}
```

Strengths: future adapters can be added with fewer core changes.  
Trade-off: metadata and capability concepts add up-front complexity for early contributors.

## Option C: Common-Case First (Plan + Generate)

This option keeps a direct path for users while preserving one planning boundary for validation and deterministic execution.

```ts
interface GeneratorCore {
  plan(config: GeneratorConfig): GenerationPlan;
  generate(config: GeneratorConfig): Promise<RunSummary>;
  parseCliArgs(argv: string[]): GeneratorConfig;
}

interface AdapterInstance {
  metadata: AdapterMetadata;
  probeSSR(input: SSRProbeInput): Promise<SSRProbeResult>;
  enrichMetadata(input: MetadataEnrichmentInput): Promise<MetadataEnrichmentOutput>;
  integrateRuntime(input: RuntimeIntegrationInput): Promise<RuntimeIntegrationOutput>;
}
```

Strengths: keeps common usage obvious, supports dry-run/safety checks, and gives core a deterministic planner boundary.  
Trade-off: two primary core methods instead of one.

## Comparison and selection

Option A is the simplest to call, but it hides too many planning details that are important for deterministic CI and explicit safety failures.

Option B is the most adaptable long-term, but it introduces a wider conceptual surface before the first runnable CLI tracer bullet.

Option C best fits the current migration phase because it keeps the common path small while still exposing a dedicated planning boundary required by the PRD safety and determinism goals.

Selected approach: Option C with two stable core methods (`plan`, `generate`) plus CLI parsing owned by core.

## Final selected contract

### Core responsibilities

- Parse and validate config from default JSON path and optional JS config.
- Build a deterministic generation plan sorted by project id.
- Enforce safety rules (workspace boundary, output collision, unknown project id targeting).
- Load adapter packages explicitly from `adapterPackage`.
- Orchestrate sequential by default, with optional parallel mode later.
- Emit normalized run summary with unique sorted error codes.

```ts
interface GeneratorProject {
  id: string;
  adapter: string;
  adapterPackage: string;
  source: string;
  outDir: string;
  cleanOutput?: boolean;
  adapterOptions?: Record<string, unknown>;
}

interface GeneratorConfig {
  projects: GeneratorProject[];
  dryRun?: boolean;
  parallel?: boolean;
  format?: boolean;
  summaryPath?: string;
}

interface GeneratorCore {
  plan(config: GeneratorConfig): GenerationPlan;
  generate(config: GeneratorConfig): Promise<RunSummary>;
  parseCliArgs(argv: string[]): GeneratorConfig;
}
```

### Adapter responsibilities

- Provide adapter identity and capability metadata.
- Probe SSR capability for a project.
- Enrich metadata for component generation.
- Apply runtime integration details (imports/runtime hooks/output details).
- Never expose or own the generation orchestrator API.

```ts
interface AdapterMetadata {
  name: string;
  version: string;
  metadataSubpath?: string;
  ssrSubpath?: string;
}

interface SSRProbeResult {
  available: boolean;
  warning?: string;
}

interface AdapterInstance {
  metadata: AdapterMetadata;
  probeSSR(input: SSRProbeInput): Promise<SSRProbeResult>;
  enrichMetadata(input: MetadataEnrichmentInput): Promise<MetadataEnrichmentOutput>;
  integrateRuntime(input: RuntimeIntegrationInput): Promise<RuntimeIntegrationOutput>;
}
```

## SSR fallback and warning contract

- If `probeSSR().available` is false, core switches that project to CEM-only flow.
- Core records a deterministic warning in project logs and run summary warning fields.
- This fallback is not a hard failure unless the project explicitly requires SSR in adapter options.

## Metadata integration touchpoints

- Core parses and normalizes CEM input once per project.
- Adapter receives normalized metadata through `enrichMetadata`.
- Adapter returns enriched metadata for wrapper emission and runtime integration output.
- Core keeps file writing, cleanup, provenance headers, and summary emission.

## Why this is the right tracer bullet output

- At least two radically different options are documented and compared.
- Final contracts clearly separate core orchestration from adapter runtime/metadata concerns.
- SSR capability probing, fallback signaling, and metadata touchpoints are explicit and testable.
