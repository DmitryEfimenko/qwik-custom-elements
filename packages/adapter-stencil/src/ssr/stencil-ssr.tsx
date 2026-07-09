import {
  $,
  component$,
  Slot,
  SSRRaw,
  SSRStream,
  useId,
  useOnDocument,
  useSignal,
  useTask$,
  type QRL,
} from '@builder.io/qwik';

import { updateStencilElementProps } from './element-props-utils';
import type { StencilRenderToString, StencilSSRProps } from './model';
import {
  collectStencilSsrStyles,
  createStencilSsrStyleStore,
} from './styles-core';

export { updateStencilElementProps } from './element-props-utils';

function isRuntimeBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isRuntimeServer(): boolean {
  return !isRuntimeBrowser();
}

const INLINE_EMITTED_KEY = '__stencil_ssr_inline_emitted__';
const EVENT_QRL_IDS = new WeakMap<object, number>();
let eventQrlIdCounter = 0;

function getEventQrlId(qrl: unknown): number {
  if (!qrl || (typeof qrl !== 'object' && typeof qrl !== 'function')) {
    return -1;
  }
  const qrlObj = qrl as object;
  const existing = EVENT_QRL_IDS.get(qrlObj);
  if (existing) {
    return existing;
  }
  const next = ++eventQrlIdCounter;
  EVENT_QRL_IDS.set(qrlObj, next);
  return next;
}

/**
 * Retrieves or creates a request-scoped set of emitted style keys.
 * This ensures styles are deduplicated per request when the same component
 * is rendered multiple times (e.g., in a list).
 */
function getOrInitRequestInlineEmittedKeys(): Set<string> {
  const reqEnv = (
    globalThis as { qcAsyncRequestStore?: { getStore?: () => unknown } }
  ).qcAsyncRequestStore?.getStore?.() as
    | { sharedMap: Map<string, unknown> }
    | undefined;

  if (!reqEnv?.sharedMap || !(reqEnv.sharedMap instanceof Map)) {
    return new Set<string>();
  }

  const existing = reqEnv.sharedMap.get(INLINE_EMITTED_KEY) as
    | Set<string>
    | undefined;
  if (existing) {
    return existing;
  }

  const created = new Set<string>();
  reqEnv.sharedMap.set(INLINE_EMITTED_KEY, created);
  return created;
}

/**
 * Extracts styles from `renderResult` and returns them as a concatenated
 * `<style>` HTML string, deduplicating across multiple renders in the same
 * request. Returns an empty string when there is nothing new to emit.
 */
export function buildInlineStylesHtml(
  renderResult: Awaited<ReturnType<StencilRenderToString>>,
  tagName?: string,
): string {
  const emittedKeys = getOrInitRequestInlineEmittedKeys();

  const tempStore = createStencilSsrStyleStore();
  collectStencilSsrStyles(renderResult, tempStore, tagName);

  let html = '';
  for (const [key, style] of tempStore.stylesByKey) {
    if (!emittedKeys.has(key)) {
      emittedKeys.add(key);
      html += `<style sty-id="${key}">${style}</style>`;
    }
  }
  return html;
}

export const DEFAULT_SLOT_MARKER = '<!--SLOT-->';
export const DEFAULT_NAMED_SLOT_PLACEHOLDER_TAG = 'span';

export function namedSlotMarker(name: string) {
  return `<!--SLOT:${name}-->`;
}

export function getStencilElement(
  wrapper: HTMLDivElement | undefined,
  tagName: string,
) {
  return wrapper?.querySelector<HTMLElement>(tagName);
}

export function getWrapperElement(
  wrapperId: string,
): HTMLDivElement | undefined {
  if (!isRuntimeBrowser()) return undefined;
  return (
    document.querySelector<HTMLDivElement>(
      `[data-stencil-wrapper-id="${wrapperId}"]`,
    ) ?? undefined
  );
}

export function getEventEntries(events: StencilSSRProps['events']) {
  return Object.entries(events ?? {}).filter(
    ([eventName, eventQrl]) => eventName.trim().length > 0 && Boolean(eventQrl),
  );
}

export function getEventsDependencyKey(
  events: StencilSSRProps['events'],
): string {
  return getEventEntries(events)
    .map(([eventName, eventQrl]) => {
      return `${eventName}:${getEventQrlId(eventQrl)}`;
    })
    .sort()
    .join('|');
}

type EventQrlInternal = QRL<(...args: any[]) => void> & {
  $setContainer$?: (containerEl: Element) => void;
};

/**
 * Builds the HTML string passed to Stencil's renderToString.
 * The default slot gets `<!--SLOT-->` as its light-DOM child.
 * Each named slot gets a `<div slot="name"><!--SLOT:name--></div>` wrapper
 * so Stencil places the marker inside the correct slot outlet in its output.
 */
export function buildInputHtml(tagName: string, slots: string[]) {
  return buildInputHtmlWithOptions(tagName, slots);
}

export function buildInputHtmlWithOptions(
  tagName: string,
  slots: string[],
  options?: { useLegacyNamedSlotWrapper?: boolean },
) {
  const namedSlotTag = options?.useLegacyNamedSlotWrapper
    ? 'div'
    : DEFAULT_NAMED_SLOT_PLACEHOLDER_TAG;

  const namedSlotHtml = slots
    .map(
      (s) =>
        `<${namedSlotTag} slot="${s}" style="display:contents">${namedSlotMarker(s)}</${namedSlotTag}>`,
    )
    .join('');
  return `<${tagName}>${DEFAULT_SLOT_MARKER}${namedSlotHtml}</${tagName}>`;
}

export type SlotEntry = { marker: string; name?: string; position: number };

/**
 * Locates all slot markers present in `html`, sorted by their position.
 * Returns entries only for markers that actually appear in the output
 * (Stencil may omit a slot outlet if it has no matching slot element).
 * Marker positions are pre-computed to avoid redundant string searches.
 */
export function collectSlotEntries(
  html: string,
  namedSlots: string[],
): SlotEntry[] {
  const candidates: Array<{ marker: string; name?: string }> = [
    { marker: DEFAULT_SLOT_MARKER, name: undefined },
    ...namedSlots.map((s) => ({ marker: namedSlotMarker(s), name: s })),
  ];

  // Pre-compute marker positions and filter to those present in HTML
  const entries: SlotEntry[] = [];
  for (const { marker, name } of candidates) {
    const position = html.indexOf(marker);
    if (position !== -1) {
      entries.push({ marker, name, position });
    }
  }

  // Filter candidates to present markers and sort by position
  return entries.sort((a, b) => a.position - b.position);
}

export function stripSlotMarkersFromHtml(
  html: string,
  namedSlots: string[],
): string {
  let cleaned = html.replaceAll(DEFAULT_SLOT_MARKER, '');
  for (const name of namedSlots) {
    cleaned = cleaned.replaceAll(namedSlotMarker(name), '');
  }
  return cleaned;
}

function emitSsrRawChunk(html: string, namedSlots: string[]) {
  const cleaned = stripSlotMarkersFromHtml(html, namedSlots);
  if (cleaned.length === 0) {
    return null;
  }
  return <SSRRaw data={cleaned} />;
}

/**
 * Creates a Qwik component that renders a Stencil component with SSR support.
 * Handles slot projection, prop synchronization, and style deduplication.
 */
export function createStencilSSRBridgeComponent(
  stencilRenderToString$: QRL<StencilRenderToString>,
  options?: {
    onSsrRenderResultQrl?: QRL<
      (
        result: Awaited<ReturnType<StencilRenderToString>>,
      ) => void | Promise<void>
    >;
  },
) {
  return component$<StencilSSRProps>(
    ({ tagName, props, events, slots, ...restProps }) => {
      const wrapperRef = useSignal<HTMLDivElement | undefined>(undefined);
      const clientReady = useSignal(false);
      const wrapperId = useId();
      const namedSlots = slots ?? [];
      const ElementTag = tagName as any;

      useOnDocument(
        'qinit',
        $(() => {
          clientReady.value = true;
        }),
      );

      useTask$(({ track }) => {
        const trackedProps = track(() => props);
        if (!isRuntimeBrowser()) return;
        const wrapper = getWrapperElement(wrapperId) ?? wrapperRef.value;
        updateStencilElementProps(
          getStencilElement(wrapper, tagName),
          trackedProps,
        );
      });

      useTask$(({ cleanup, track }) => {
        const ready = track(() => clientReady.value);
        const eventsDependencyKey = track(() => getEventsDependencyKey(events));

        if (!isRuntimeBrowser() || !ready) return;

        const wrapper = getWrapperElement(wrapperId) ?? wrapperRef.value;
        const stencilEl = getStencilElement(wrapper, tagName);
        const eventEntries = getEventEntries(events);

        if (!stencilEl || eventEntries.length === 0) {
          return;
        }

        if (eventsDependencyKey.length === 0) {
          return;
        }

        let disposed = false;
        const listeners: Array<{ eventName: string; listener: EventListener }> =
          [];

        cleanup(() => {
          disposed = true;
          for (const { eventName, listener } of listeners) {
            stencilEl.removeEventListener(eventName, listener);
          }
        });

        for (const [eventName, eventQrl] of eventEntries) {
          const listener: EventListener = (event) => {
            const qrl = eventQrl as EventQrlInternal;
            const containerEl = stencilEl.closest('[q\\:container]');
            if (containerEl) {
              qrl.$setContainer$?.(containerEl);
            }

            const result = eventQrl(event, stencilEl);
            void Promise.resolve(result).catch((error) => {
              console.error(error);
            });
          };

          if (disposed) {
            return;
          }

          stencilEl.addEventListener(eventName, listener);
          listeners.push({ eventName, listener });
        }
      });

      if (isRuntimeServer()) {
        return (
          <div
            ref={wrapperRef}
            data-stencil-wrapper-id={wrapperId}
            {...restProps}
            style={{ display: 'contents' }}
          >
            <SSRStream>
              {async function* () {
                const renderToString = await stencilRenderToString$.resolve();
                const renderResult = await renderToString(
                  buildInputHtml(tagName, namedSlots),
                  {
                    prettyHtml: true,
                    removeScripts: false,
                    beforeHydrate: (root) => {
                      updateStencilElementProps(
                        root.querySelector(tagName),
                        props,
                      );
                    },
                  },
                );
                const html = renderResult.html ?? '';

                if (options?.onSsrRenderResultQrl) {
                  const onSsrRenderResult =
                    await options.onSsrRenderResultQrl.resolve();
                  await onSsrRenderResult(renderResult);
                }

                const inlineStylesHtml = buildInlineStylesHtml(
                  renderResult,
                  tagName,
                );
                if (inlineStylesHtml) {
                  yield <SSRRaw data={inlineStylesHtml} />;
                }

                const bodyHtml =
                  html.match(/<body>([\s\S]*)<\/body>/)?.[1] || html;
                const entries = collectSlotEntries(bodyHtml, namedSlots);

                if (entries.length === 0) {
                  const chunk = emitSsrRawChunk(bodyHtml, namedSlots);
                  if (chunk) {
                    yield chunk;
                  }
                  return;
                }

                let cursor = 0;
                for (const entry of entries) {
                  const markerIndex = entry.position;
                  if (markerIndex > cursor) {
                    const chunk = emitSsrRawChunk(
                      bodyHtml.slice(cursor, markerIndex),
                      namedSlots,
                    );
                    if (chunk) {
                      yield chunk;
                    }
                  }
                  if (entry.name) {
                    yield <Slot name={entry.name} />;
                  } else {
                    yield <Slot />;
                  }
                  cursor = markerIndex + entry.marker.length;
                }
                if (cursor < bodyHtml.length) {
                  const chunk = emitSsrRawChunk(
                    bodyHtml.slice(cursor),
                    namedSlots,
                  );
                  if (chunk) {
                    yield chunk;
                  }
                }
              }}
            </SSRStream>
          </div>
        );
      }

      return (
        <div
          ref={wrapperRef}
          data-stencil-wrapper-id={wrapperId}
          {...restProps}
          style={{ display: 'contents' }}
        >
          <ElementTag>
            <Slot />
            {namedSlots.map((name) => (
              <span key={name} slot={name} style={{ display: 'contents' }}>
                <Slot name={name} />
              </span>
            ))}
          </ElementTag>
        </div>
      );
    },
  );
}
