import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GenerateContext,
  MetadataComponent,
  MetadataProp,
  NormalizedMetadata,
} from '../types';

interface CollectionManifest {
  entries?: string[];
}

interface DtsProp {
  type: string;
  required: boolean;
}

function panicFallback(message: string): never {
  throw new Error(`Dist fallback metadata error: ${message}`);
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function extractBraceBlock(source: string, openBraceIndex: number): string {
  let depth = 0;

  for (let index = openBraceIndex; index < source.length; index++) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBraceIndex, index + 1);
      }
    }
  }

  panicFallback(
    'Unable to find a balanced object block while parsing collection component metadata.',
  );
}

function parseCollectionPropertiesObject(
  fileText: string,
): Record<string, unknown> {
  const marker = 'static get properties()';
  const markerIndex = fileText.indexOf(marker);
  if (markerIndex < 0) {
    return {};
  }

  const returnIndex = fileText.indexOf('return', markerIndex);
  if (returnIndex < 0) {
    return {};
  }

  const objectStart = fileText.indexOf('{', returnIndex);
  if (objectStart < 0) {
    return {};
  }

  const objectLiteral = extractBraceBlock(fileText, objectStart);

  try {
    return Function(`"use strict"; return (${objectLiteral});`)() as Record<
      string,
      unknown
    >;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown parse error.';
    panicFallback(`Unable to parse static properties() object: ${message}`);
  }
}

function parseTagName(fileText: string): string | null {
  const tagMatch = /static get is\(\)\s*\{\s*return\s+"([^"]+)";\s*\}/.exec(
    fileText,
  );
  return tagMatch?.[1] ?? null;
}

function propFromCollectionConfig(name: string, config: unknown): MetadataProp {
  const typedConfig = (config ?? {}) as {
    type?: string;
    required?: boolean;
    reflect?: boolean;
    defaultValue?: string;
    complexType?: {
      resolved?: string;
      original?: string;
    };
  };

  return {
    name,
    type:
      typedConfig.complexType?.resolved ??
      typedConfig.complexType?.original ??
      typedConfig.type ??
      'unknown',
    required: typedConfig.required === true,
    reflect: typedConfig.reflect,
    defaultValue: typedConfig.defaultValue,
  };
}

function parseLocalJsxTypes(componentsDtsText: string): Map<string, DtsProp> {
  const localJsxStart = componentsDtsText.indexOf('declare namespace LocalJSX');
  if (localJsxStart < 0) {
    return new Map();
  }

  const localOpenBrace = componentsDtsText.indexOf('{', localJsxStart);
  if (localOpenBrace < 0) {
    return new Map();
  }

  const localJsxBlock = extractBraceBlock(componentsDtsText, localOpenBrace);
  const interfaceTypeMap = new Map<string, Map<string, DtsProp>>();

  const interfaceRegex = /interface\s+(\w+)\s*\{([\s\S]*?)\n\s*\}/g;
  let interfaceMatch: RegExpExecArray | null =
    interfaceRegex.exec(localJsxBlock);
  while (interfaceMatch) {
    const interfaceName = interfaceMatch[1];
    const body = interfaceMatch[2];
    const props = new Map<string, DtsProp>();

    const propRegex = /"([^"]+)"(\?)?:\s*([^;]+);/g;
    let propMatch: RegExpExecArray | null = propRegex.exec(body);
    while (propMatch) {
      props.set(propMatch[1], {
        type: propMatch[3].trim(),
        required: propMatch[2] !== '?',
      });
      propMatch = propRegex.exec(body);
    }

    if (props.size > 0) {
      interfaceTypeMap.set(interfaceName, props);
    }

    interfaceMatch = interfaceRegex.exec(localJsxBlock);
  }

  const tagToTypeName = new Map<string, string>();
  const intrinsicElementsMatch =
    /interface\s+IntrinsicElements\s*\{([\s\S]*?)\n\s*\}/.exec(localJsxBlock);

  if (intrinsicElementsMatch) {
    const intrinsicBody = intrinsicElementsMatch[1];
    const tagRegex = /"([^"]+)":\s*Omit<(\w+),/g;
    let tagMatch: RegExpExecArray | null = tagRegex.exec(intrinsicBody);
    while (tagMatch) {
      tagToTypeName.set(tagMatch[1], tagMatch[2]);
      tagMatch = tagRegex.exec(intrinsicBody);
    }
  }

  const result = new Map<string, DtsProp>();
  for (const [tagName, typeName] of tagToTypeName.entries()) {
    const propMap = interfaceTypeMap.get(typeName);
    if (!propMap) {
      continue;
    }

    for (const [propName, propType] of propMap.entries()) {
      result.set(`${tagName}::${propName}`, propType);
    }
  }

  return result;
}

function mergeDtsTypes(
  tagName: string,
  collectionProps: MetadataProp[],
  dtsTypes: Map<string, DtsProp>,
): MetadataProp[] {
  const merged = new Map<string, MetadataProp>();

  for (const prop of collectionProps) {
    const dtsProp = dtsTypes.get(`${tagName}::${prop.name}`);
    merged.set(prop.name, {
      ...prop,
      type: dtsProp?.type ?? prop.type,
      required: dtsProp?.required ?? prop.required,
    });
  }

  for (const [key, dtsProp] of dtsTypes.entries()) {
    const [dtsTag, propName] = key.split('::');
    if (dtsTag !== tagName || merged.has(propName)) {
      continue;
    }

    merged.set(propName, {
      name: propName,
      type: dtsProp.type,
      required: dtsProp.required,
    });
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function parseCollectionComponent(
  entryPath: string,
  sourceRoot: string,
): {
  tagName: string;
  props: MetadataProp[];
} {
  const filePath = resolve(sourceRoot, 'dist/collection', entryPath);
  const fileText = readFileSync(filePath, 'utf-8');
  const tagName = parseTagName(fileText);
  if (!tagName) {
    panicFallback(
      `Unable to extract tag name from collection component file: ${filePath}`,
    );
  }

  const propertiesObject = parseCollectionPropertiesObject(fileText);
  const props: MetadataProp[] = Object.entries(propertiesObject).map(
    ([name, config]) => propFromCollectionConfig(name, config),
  );

  return {
    tagName,
    props: props.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function loadDistFallbackMetadata(
  context: GenerateContext,
): Promise<NormalizedMetadata> {
  const manifest = JSON.parse(
    readFileSync(context.source.collectionManifestPath, 'utf-8'),
  ) as CollectionManifest;
  const entryPaths = manifest.entries ?? [];

  const dtsText = readFileSync(context.source.componentsTypesPath, 'utf-8');
  const dtsPropTypes = parseLocalJsxTypes(dtsText);

  const components: MetadataComponent[] = [];

  for (const entryPath of entryPaths) {
    const parsed = parseCollectionComponent(
      entryPath,
      context.source.sourceRoot,
    );

    components.push({
      componentName: toPascalCase(parsed.tagName),
      tagName: parsed.tagName,
      props: mergeDtsTypes(parsed.tagName, parsed.props, dtsPropTypes),
      namedSlots: [],
      hasDefaultSlot: false,
      events: [],
      methods: [],
    });
  }

  return {
    provider: 'dist-fallback',
    sourceRoot: context.source.sourceRoot,
    provenance: {
      metadataProvider: 'dist-fallback',
      sourceRoot: context.source.sourceRoot,
      slotFallbackApplied: false,
    },
    components: components.sort((a, b) => a.tagName.localeCompare(b.tagName)),
  };
}
