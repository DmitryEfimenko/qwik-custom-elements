import type { DocumentStyle, RequestEventBase } from '@builder.io/qwik-city';
import type { StencilRenderToStringResult } from './model';

const STENCIL_STYLE_STORE_KEY = '__stencil_ssr_style_store__';

export interface StencilSsrStyleStore {
  stylesByKey: Map<string, string>;
}

export interface StencilSsrHeadStyleOptions {
  keyPrefix?: string;
  nonce?: string;
}

function normalizeStyleKey(
  styleId?: string,
  styleText = '',
  tagName?: string,
): string {
  if (styleId && styleId.length > 0) {
    return styleId;
  }
  // If no styleId but tagName available, use scope ID convention (sc-${tagName})
  if (tagName) {
    return `sc-${tagName}`;
  }
  // Fallback to content-based key
  return `inline-${styleText.length}-${styleText.slice(0, 32)}`;
}

/**
 * Creates a new style store for collecting Stencil component styles during SSR.
 */
export function createStencilSsrStyleStore(): StencilSsrStyleStore {
  return {
    stylesByKey: new Map<string, string>(),
  };
}

/**
 * Retrieves or creates a request-scoped style store from the Qwik request context.
 * Ensures styles are deduplicated across multiple renders in the same request.
 */
export function getOrCreateStencilSsrStyleStore(
  requestEvent: Pick<RequestEventBase, 'sharedMap'>,
): StencilSsrStyleStore {
  const existing = requestEvent.sharedMap.get(STENCIL_STYLE_STORE_KEY) as
    | StencilSsrStyleStore
    | undefined;

  if (existing) {
    return existing;
  }

  const created = createStencilSsrStyleStore();
  requestEvent.sharedMap.set(STENCIL_STYLE_STORE_KEY, created);
  return created;
}

/**
 * Collects styles from a Stencil renderToString result and stores them.
 * Normalizes style keys and deduplicates by key to prevent CSS duplication.
 */
export function collectStencilSsrStyles(
  result: StencilRenderToStringResult,
  styleStore: StencilSsrStyleStore,
  tagName?: string,
) {
  if (!result.styles || result.styles.length === 0) {
    return;
  }

  for (const styleEntry of result.styles) {
    const styleText = styleEntry.content ?? '';
    const styleId = styleEntry.id;
    if (!styleText) continue;

    const key = normalizeStyleKey(styleId, styleText, tagName);
    styleStore.stylesByKey.set(key, styleText);
  }
}

/**
 * Converts collected styles from a style store into Qwik DocumentStyle[]
 * for use in document head rendering. Supports key prefixing and CSP nonce.
 */
export function toDocumentHeadStyles(
  styleStore: StencilSsrStyleStore,
  options?: StencilSsrHeadStyleOptions,
): DocumentStyle[] {
  const keyPrefix = options?.keyPrefix ?? 'stencil-ssr';
  const nonce = options?.nonce;

  return [...styleStore.stylesByKey.entries()].map(([styleKey, style]) => ({
    key: `${keyPrefix}-${styleKey}`,
    style,
    props: nonce ? { nonce } : undefined,
  }));
}
