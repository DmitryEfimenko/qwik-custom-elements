import type {
  MetadataComponent,
  MetadataEvent,
  MetadataMethod,
  MetadataProp,
  NormalizedMetadata,
} from '../types';

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function normalizeProp(prop: MetadataProp): MetadataProp {
  return {
    name: prop.name.trim(),
    type: prop.type.trim(),
    required: prop.required,
    reflect: prop.reflect,
    defaultValue: prop.defaultValue,
  };
}

function normalizeEvent(event: MetadataEvent): MetadataEvent {
  return {
    name: event.name.trim(),
    detailType: event.detailType?.trim(),
  };
}

function normalizeMethod(method: MetadataMethod): MetadataMethod {
  return {
    name: method.name.trim(),
    signature: method.signature.trim(),
  };
}

function normalizeComponent(component: MetadataComponent): MetadataComponent {
  const tagName = component.tagName.trim();
  const componentName = component.componentName.trim() || toPascalCase(tagName);

  const propMap = new Map<string, MetadataProp>();
  for (const prop of component.props) {
    const normalized = normalizeProp(prop);
    if (!normalized.name) {
      continue;
    }

    propMap.set(normalized.name, normalized);
  }

  const eventMap = new Map<string, MetadataEvent>();
  for (const event of component.events) {
    const normalized = normalizeEvent(event);
    if (!normalized.name) {
      continue;
    }

    eventMap.set(normalized.name, normalized);
  }

  const methodMap = new Map<string, MetadataMethod>();
  for (const method of component.methods) {
    const normalized = normalizeMethod(method);
    if (!normalized.name) {
      continue;
    }

    methodMap.set(normalized.name, normalized);
  }

  const namedSlots = new Set<string>();
  for (const slot of component.namedSlots) {
    const normalized = slot.trim();
    if (!normalized || normalized === 'default') {
      continue;
    }

    namedSlots.add(normalized);
  }

  return {
    componentName,
    tagName,
    props: [...propMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    events: [...eventMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    methods: [...methodMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    namedSlots: [...namedSlots].sort((a, b) => a.localeCompare(b)),
    hasDefaultSlot: component.hasDefaultSlot,
  };
}

export function normalizeMetadata(
  metadata: NormalizedMetadata,
): NormalizedMetadata {
  const componentMap = new Map<string, MetadataComponent>();

  for (const component of metadata.components) {
    const normalized = normalizeComponent(component);
    if (!normalized.tagName) {
      continue;
    }

    componentMap.set(normalized.tagName, normalized);
  }

  const sourceRoot = metadata.sourceRoot.trim();

  return {
    provider: metadata.provider,
    sourceRoot,
    provenance: {
      metadataProvider: metadata.provenance.metadataProvider,
      sourceRoot,
      slotFallbackApplied: metadata.provenance.slotFallbackApplied,
    },
    components: [...componentMap.values()].sort((a, b) =>
      a.tagName.localeCompare(b.tagName),
    ),
  };
}
