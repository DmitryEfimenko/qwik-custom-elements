import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GenerateContext, NormalizedMetadata } from '../types';

interface SlotDiscoveryResult {
  hasDefaultSlot: boolean;
  namedSlots: string[];
}

interface CollectionManifest {
  entries?: string[];
}

function extractBalancedCall(text: string, openParenIndex: number): string {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let escaped = false;

  for (let index = openParenIndex; index < text.length; index++) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inDoubleQuote && !inTemplate && char === "'") {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && !inTemplate && char === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '`') {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inTemplate) {
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openParenIndex, index + 1);
      }
    }
  }

  return text.slice(openParenIndex);
}

function parseTagName(fileText: string): string | null {
  const tagMatch = /static get is\(\)\s*\{\s*return\s+"([^"]+)";\s*\}/.exec(
    fileText,
  );
  return tagMatch?.[1] ?? null;
}

function discoverSlotsFromCollectionComponent(
  fileText: string,
): SlotDiscoveryResult {
  const namedSlots = new Set<string>();
  let hasDefaultSlot = false;

  let cursor = 0;
  while (cursor < fileText.length) {
    const slotCallStart = fileText.indexOf('h("slot"', cursor);
    if (slotCallStart < 0) {
      break;
    }

    const openParenIndex = fileText.indexOf('(', slotCallStart);
    if (openParenIndex < 0) {
      break;
    }

    const callText = extractBalancedCall(fileText, openParenIndex);
    const nameMatch = /name\s*:\s*['"]([^'"]+)['"]/.exec(callText);

    if (!nameMatch) {
      hasDefaultSlot = true;
    } else {
      const slotName = nameMatch[1].trim();
      if (slotName.length === 0 || slotName === 'default') {
        hasDefaultSlot = true;
      } else {
        namedSlots.add(slotName);
      }
    }

    cursor = slotCallStart + 'h("slot"'.length;
  }

  return {
    hasDefaultSlot,
    namedSlots: [...namedSlots].sort((a, b) => a.localeCompare(b)),
  };
}

function discoverSlotsFromCollection(
  context: GenerateContext,
): Map<string, SlotDiscoveryResult> {
  const manifest = JSON.parse(
    readFileSync(context.source.collectionManifestPath, 'utf-8'),
  ) as CollectionManifest;

  const result = new Map<string, SlotDiscoveryResult>();

  for (const entryPath of manifest.entries ?? []) {
    const componentFilePath = resolve(
      context.source.sourceRoot,
      'dist/collection',
      entryPath,
    );
    const fileText = readFileSync(componentFilePath, 'utf-8');
    const tagName = parseTagName(fileText);
    if (!tagName) {
      continue;
    }

    result.set(tagName, discoverSlotsFromCollectionComponent(fileText));
  }

  return result;
}

export function applySlotDiscoveryFallback(
  context: GenerateContext,
  metadata: NormalizedMetadata,
): NormalizedMetadata {
  const discoveredSlots = discoverSlotsFromCollection(context);

  const components = metadata.components.map((component) => {
    const discovered = discoveredSlots.get(component.tagName);
    if (!discovered) {
      return component;
    }

    const namedSlots = new Set<string>([
      ...component.namedSlots,
      ...discovered.namedSlots,
    ]);

    return {
      ...component,
      hasDefaultSlot: component.hasDefaultSlot || discovered.hasDefaultSlot,
      namedSlots: [...namedSlots].sort((a, b) => a.localeCompare(b)),
    };
  });

  return {
    ...metadata,
    provenance: {
      ...metadata.provenance,
      slotFallbackApplied: true,
    },
    components,
  };
}
