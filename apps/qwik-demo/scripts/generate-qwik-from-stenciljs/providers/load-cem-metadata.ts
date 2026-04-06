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

interface CemTypeRef {
  text?: string;
}

interface CemAttribute {
  name?: string;
  fieldName?: string;
  type?: CemTypeRef;
  default?: string;
}

interface CemSlot {
  name?: string;
}

interface CemMember {
  kind?: string;
  name?: string;
  type?: CemTypeRef;
  optional?: boolean;
  default?: string;
  reflects?: boolean;
  attribute?: string;
}

interface CemEvent {
  name?: string;
  type?: CemTypeRef;
}

interface CemDeclaration {
  customElement?: boolean;
  tagName?: string;
  name?: string;
  members?: CemMember[];
  attributes?: CemAttribute[];
  events?: CemEvent[];
  slots?: CemSlot[];
}

interface CemModule {
  declarations?: CemDeclaration[];
}

interface CemDocument {
  modules?: CemModule[];
}

function findCemPath(sourceRoot: string): string | null {
  const candidates = [
    resolve(sourceRoot, 'custom-elements.json'),
    resolve(sourceRoot, 'dist/custom-elements.json'),
    resolve(sourceRoot, 'dist/docs/custom-elements.json'),
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

function readPropsFromDeclaration(declaration: CemDeclaration): MetadataProp[] {
  const propMap = new Map<string, MetadataProp>();

  for (const attr of declaration.attributes ?? []) {
    const propName = attr.fieldName ?? attr.name;
    if (!propName) {
      continue;
    }

    propMap.set(propName, {
      name: propName,
      type: attr.type?.text ?? 'unknown',
      required: false,
      defaultValue: attr.default,
    });
  }

  for (const member of declaration.members ?? []) {
    if (member.kind !== 'field' || !member.name) {
      continue;
    }

    const existing = propMap.get(member.name);
    const required =
      member.optional === true ? false : member.default === undefined;

    propMap.set(member.name, {
      name: member.name,
      type: member.type?.text ?? existing?.type ?? 'unknown',
      required,
      reflect: member.reflects,
      defaultValue: member.default ?? existing?.defaultValue,
    });
  }

  return [...propMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function readEventsFromDeclaration(
  declaration: CemDeclaration,
): MetadataEvent[] {
  const events: MetadataEvent[] = [];

  for (const event of declaration.events ?? []) {
    if (!event.name) {
      continue;
    }

    events.push({
      name: event.name,
      detailType: event.type?.text,
    });
  }

  return events;
}

function readMethodsFromDeclaration(
  declaration: CemDeclaration,
): MetadataMethod[] {
  const methods: MetadataMethod[] = [];

  for (const member of declaration.members ?? []) {
    if (member.kind !== 'method' || !member.name) {
      continue;
    }

    methods.push({
      name: member.name,
      signature: member.type?.text ?? '(...args: unknown[]) => unknown',
    });
  }

  return methods;
}

function readSlotsFromDeclaration(declaration: CemDeclaration): {
  hasDefaultSlot: boolean;
  namedSlots: string[];
} {
  const namedSlots = new Set<string>();
  let hasDefaultSlot = false;

  for (const slot of declaration.slots ?? []) {
    const normalized = normalizeSlotName(slot.name);
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

function declarationToComponent(
  declaration: CemDeclaration,
): MetadataComponent | null {
  if (!declaration.customElement || !declaration.tagName) {
    return null;
  }

  const slots = readSlotsFromDeclaration(declaration);

  return {
    componentName: declaration.name ?? toPascalCase(declaration.tagName),
    tagName: declaration.tagName,
    props: readPropsFromDeclaration(declaration),
    namedSlots: slots.namedSlots,
    hasDefaultSlot: slots.hasDefaultSlot,
    events: readEventsFromDeclaration(declaration),
    methods: readMethodsFromDeclaration(declaration),
  };
}

export async function loadCemMetadata(
  context: GenerateContext,
): Promise<NormalizedMetadata | null> {
  const cemPath = findCemPath(context.source.sourceRoot);
  if (!cemPath) {
    return null;
  }

  let parsed: CemDocument;
  try {
    parsed = JSON.parse(readFileSync(cemPath, 'utf-8')) as CemDocument;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error.';
    throw new Error(
      `Failed to parse custom elements manifest at ${cemPath}: ${message}`,
    );
  }

  const componentsByTag = new Map<string, MetadataComponent>();

  for (const moduleEntry of parsed.modules ?? []) {
    for (const declaration of moduleEntry.declarations ?? []) {
      const component = declarationToComponent(declaration);
      if (!component) {
        continue;
      }

      componentsByTag.set(component.tagName, component);
    }
  }

  if (componentsByTag.size === 0) {
    return null;
  }

  return {
    provider: 'custom-elements-manifest',
    sourceRoot: context.source.sourceRoot,
    provenance: {
      metadataProvider: 'custom-elements-manifest',
      sourceRoot: context.source.sourceRoot,
      slotFallbackApplied: false,
    },
    components: [...componentsByTag.values()].sort((a, b) =>
      a.tagName.localeCompare(b.tagName),
    ),
  };
}
