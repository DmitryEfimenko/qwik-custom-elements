import type { GenerateContext, NormalizedMetadata } from '../types';
import { loadCemMetadata } from './load-cem-metadata';
import { loadDistFallbackMetadata } from './load-dist-fallback-metadata';
import { loadDocsJsonMetadata } from './load-docs-json-metadata';
import { applySlotDiscoveryFallback } from './slot-discovery-fallback';

export async function loadRawMetadata(
  context: GenerateContext,
): Promise<NormalizedMetadata> {
  const cem = await loadCemMetadata(context);
  if (cem) {
    return applySlotDiscoveryFallback(context, cem);
  }

  const docs = await loadDocsJsonMetadata(context);
  if (docs) {
    return applySlotDiscoveryFallback(context, docs);
  }

  const fallback = await loadDistFallbackMetadata(context);
  return applySlotDiscoveryFallback(context, fallback);
}
