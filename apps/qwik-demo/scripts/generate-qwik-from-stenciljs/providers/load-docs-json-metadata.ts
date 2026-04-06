import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GenerateContext,
  MetadataComponent,
  MetadataEvent,
  MetadataMethod,
  MetadataProp,
  NormalizedMetadata,
} from '../types';

interface DocsJsonTypeRef {
  text?: string;
}

interface DocsJsonProp {
  name?: string;
  type?: string;
  required?: boolean;
  mutable?: boolean;
  reflectToAttr?: boolean;
  default?: string;
}

interface DocsJsonEvent {
  event?: string;
  name?: string;
  detail?: string;
  type?: string;
}

interface DocsJsonMethod {
  name?: string;
  signature?: string;
  docs?: string;
}

interface DocsJsonSlot {
  name?: string;
}

interface DocsJsonTag {
  name?: string;
  text?: string;
}

interface DocsJsonComponent {
  tag?: string;
  tagName?: string;
  componentClass?: string;
  props?: DocsJsonProp[];
  events?: DocsJsonEvent[];
  methods?: DocsJsonMethod[];
  slots?: DocsJsonSlot[];
  docsTags?: DocsJsonTag[];
}

interface DocsJsonDocument {
  components?: DocsJsonComponent[];
}

function findDocsJsonPath(sourceRoot: string): string | null {
  const candidates = [
    resolve(sourceRoot, 'docs.json'),
    resolve(sourceRoot, 'dist/docs.json'),
    resolve(sourceRoot, 'stencil-docs.json'),
    resolve(sourceRoot, 'docs/stencil-docs.json'),
  ];

  return candidates.find((path) => existsSync(path)) ?? null;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function normalizeSlotName(slotName: string | undefined): string {
  if (!slotName) {
    return '';
  }

  const trimmed = slotName.trim();
  if (trimmed === 'default') {
    return '';
  }

  return trimmed;
}

function propsFromDocsComponent(component: DocsJsonComponent): MetadataProp[] {
  const props: MetadataProp[] = [];

  for (const prop of component.props ?? []) {
    if (!prop.name) {
      continue;
    }

    props.push({
      name: prop.name,
      type: prop.type ?? 'unknown',
      required: prop.required === true,
      reflect: prop.reflectToAttr,
      defaultValue: prop.default,
    });
  }

  return props.sort((a, b) => a.name.localeCompare(b.name));
}

function eventsFromDocsComponent(
  component: DocsJsonComponent,
): MetadataEvent[] {
  const events: MetadataEvent[] = [];

  for (const event of component.events ?? []) {
    const name = event.event ?? event.name;
    if (!name) {
      continue;
    }

    events.push({
      name,
      detailType: event.detail ?? event.type,
    });
  }

  return events;
}

function methodsFromDocsComponent(
  component: DocsJsonComponent,
): MetadataMethod[] {
  const methods: MetadataMethod[] = [];

  for (const method of component.methods ?? []) {
    if (!method.name) {
      continue;
    }

    methods.push({
      name: method.name,
      signature: method.signature ?? '(...args: unknown[]) => unknown',
    });
  }

  return methods;
}

function slotsFromDocsComponent(component: DocsJsonComponent): {
  hasDefaultSlot: boolean;
  namedSlots: string[];
} {
  const namedSlots = new Set<string>();
  let hasDefaultSlot = false;

  for (const slot of component.slots ?? []) {
    const normalized = normalizeSlotName(slot.name);
    if (normalized.length === 0) {
      hasDefaultSlot = true;
      continue;
    }

    namedSlots.add(normalized);
  }

  for (const tag of component.docsTags ?? []) {
    if (tag.name !== 'slot') {
      continue;
    }

    const firstToken = tag.text?.trim().split(/\s+/)[0] ?? '';
    const normalized = normalizeSlotName(firstToken);
    if (normalized.length === 0) {
      hasDefaultSlot = true;
      continue;
    }

    namedSlots.add(normalized);
  }

  return {
    hasDefaultSlot,
    namedSlots: [...namedSlots].sort((a, b) => a.localeCompare(b)),
  };
}

function docsComponentToMetadata(
  component: DocsJsonComponent,
): MetadataComponent | null {
  const tagName = component.tag ?? component.tagName;
  if (!tagName) {
    return null;
  }

  const slots = slotsFromDocsComponent(component);

  return {
    componentName: component.componentClass ?? toPascalCase(tagName),
    tagName,
    props: propsFromDocsComponent(component),
    namedSlots: slots.namedSlots,
    hasDefaultSlot: slots.hasDefaultSlot,
    events: eventsFromDocsComponent(component),
    methods: methodsFromDocsComponent(component),
  };
}

export async function loadDocsJsonMetadata(
  context: GenerateContext,
): Promise<NormalizedMetadata | null> {
  const docsPath = findDocsJsonPath(context.source.sourceRoot);
  if (!docsPath) {
    return null;
  }

  let parsed: DocsJsonDocument;
  try {
    parsed = JSON.parse(readFileSync(docsPath, 'utf-8')) as DocsJsonDocument;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error.';
    throw new Error(
      `Failed to parse docs-json metadata at ${docsPath}: ${message}`,
    );
  }

  const componentsByTag = new Map<string, MetadataComponent>();

  for (const component of parsed.components ?? []) {
    const normalized = docsComponentToMetadata(component);
    if (!normalized) {
      continue;
    }

    componentsByTag.set(normalized.tagName, normalized);
  }

  if (componentsByTag.size === 0) {
    return null;
  }

  return {
    provider: 'docs-json',
    sourceRoot: context.source.sourceRoot,
    provenance: {
      metadataProvider: 'docs-json',
      sourceRoot: context.source.sourceRoot,
      slotFallbackApplied: false,
    },
    components: [...componentsByTag.values()].sort((a, b) =>
      a.tagName.localeCompare(b.tagName),
    ),
  };
}
