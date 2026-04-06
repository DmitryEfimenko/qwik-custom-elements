import {
  $,
  component$,
  isBrowser,
  isServer,
  type QRL,
  Slot,
  SSRRaw,
  SSRStream,
  useId,
  useOnDocument,
  useSignal,
  useTask$,
} from '@builder.io/qwik';

import { updateStencilElementProps } from './element-props-utils';
import type { StencilRenderToString, StencilSSRProps } from './model';
import { collectStencilSsrStyles, createStencilSsrStyleStore } from './styles-core';

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
  ).qcAsyncRequestStore?.getStore?.() as { sharedMap: Map<string, unknown> } | undefined;

  if (!reqEnv?.sharedMap || !(reqEnv.sharedMap instanceof Map)) {
    return new Set<string>();
  }

  const existing = reqEnv.sharedMap.get(INLINE_EMITTED_KEY) as Set<string> | undefined;
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
function buildInlineStylesHtml(renderResult: Awaited<ReturnType<StencilRenderToString>>, tagName?: string): string {
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

const DEFAULT_SLOT_MARKER = '<!--SLOT-->';

function namedSlotMarker(name: string) {
  return `<!--SLOT:${name}-->`;
}

function getStencilElement(
  wrapper: HTMLDivElement | undefined,
  tagName: string,
) {
  return wrapper?.querySelector<HTMLElement>(tagName);
}

function getWrapperElement(wrapperId: string): HTMLDivElement | undefined {
  if (!isBrowser) return undefined;
  return document.querySelector<HTMLDivElement>(`[data-stencil-wrapper-id="${wrapperId}"]`) ?? undefined;
}

function getEventEntries(events: StencilSSRProps['events']) {
  return Object.entries(events ?? {}).filter(
    ([eventName, eventQrl]) => eventName.trim().length > 0 && Boolean(eventQrl),
  );
}

function getEventsDependencyKey(events: StencilSSRProps['events']): string {
  return getEventEntries(events)
    .map(([eventName, eventQrl]) => {
      return `${eventName}:${getEventQrlId(eventQrl)}`;
    })
    .sort()
    .join('|');
}

type EventQrlInternal = QRL<(...args: any[]) => void> & {
  getFn?: (args?: unknown[], guard?: () => boolean) => (...args: any[]) => Promise<unknown>;
  $setContainer$?: (containerEl: Element) => void;
};

/**
 * Builds the HTML string passed to Stencil's renderToString.
 * The default slot gets `<!--SLOT-->` as its light-DOM child.
 * Each named slot gets a `<div slot="name"><!--SLOT:name--></div>` wrapper
 * so Stencil places the marker inside the correct slot outlet in its output.
 */
function buildInputHtml(tagName: string, slots: string[]) {
  const namedSlotHtml = slots
    .map((s) => `<div slot="${s}" style="display:contents">${namedSlotMarker(s)}</div>`)
    .join('');
  return `<${tagName}>${DEFAULT_SLOT_MARKER}${namedSlotHtml}</${tagName}>`;
}

type SlotEntry = { marker: string; name?: string };

/**
 * Locates all slot markers present in `html`, sorted by their position.
 * Returns entries only for markers that actually appear in the output
 * (Stencil may omit a slot outlet if it has no matching slot element).
 * Marker positions are pre-computed to avoid redundant string searches.
 */
function collectSlotEntries(html: string, namedSlots: string[]): SlotEntry[] {
  const candidates: SlotEntry[] = [
    { marker: DEFAULT_SLOT_MARKER, name: undefined },
    ...namedSlots.map((s) => ({ marker: namedSlotMarker(s), name: s })),
  ];

  // Pre-compute marker positions and filter to those present in HTML
  const markerPositions = new Map<string, number>();
  for (const candidate of candidates) {
    const pos = html.indexOf(candidate.marker);
    if (pos !== -1) {
      markerPositions.set(candidate.marker, pos);
    }
  }

  // Filter candidates to present markers and sort by position
  return candidates
    .filter((c) => markerPositions.has(c.marker))
    .sort((a, b) => markerPositions.get(a.marker)! - markerPositions.get(b.marker)!);
}

/**
 * Creates a Qwik component that renders a Stencil component with SSR support.
 * Handles slot projection, prop synchronization, and style deduplication.
 *
 * @param stencilRenderToStringQrl - QRL reference to Stencil's renderToString function
 * @param options - Optional callbacks for SSR lifecycle events
 * @returns A Qwik component that can be used like any other Qwik component
 */
export function createStencilSSRComponent(
  stencilRenderToStringQrl: QRL<StencilRenderToString>,
  options?: {
    onSsrRenderResultQrl?: QRL<
      (result: Awaited<ReturnType<StencilRenderToString>>) => void | Promise<void>
    >;
  },
) {
  return component$<StencilSSRProps>(({ tagName, props, events, slots, ...restProps }) => {
    const wrapperRef = useSignal<HTMLDivElement | undefined>(undefined);
    const clientReady = useSignal(false);
    const wrapperId = useId();
    const namedSlots = slots ?? [];

    const markClientReady$ = $(() => {
      clientReady.value = true;
    });

    useOnDocument('qinit', markClientReady$);

    // Keeps the Stencil element's props in sync with Qwik signals on the client.
    // On the server, props are applied via `beforeHydrate` inside the SSRStream.
    useTask$(({ track }) => {
      const trackedProps = track(() => props);
      if (!isBrowser) return;
      const wrapper = getWrapperElement(wrapperId) ?? wrapperRef.value;
      const stencilEl = getStencilElement(wrapper, tagName);
      updateStencilElementProps(stencilEl, trackedProps);
    });

    useTask$(({ cleanup, track }) => {
      const ready = track(() => clientReady.value);
      const eventsDependencyKey = track(() => getEventsDependencyKey(events));
      if (!isBrowser || !ready) return;

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
      const listeners: Array<{ eventName: string; listener: EventListener }> = [];

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

    if (isServer) {
      return (
        <div
          ref={wrapperRef}
          data-stencil-wrapper-id={wrapperId}
          {...restProps}
          style={{ display: 'contents' }}
        >
          <SSRStream>
            {async function* () {
              const renderToString = await stencilRenderToStringQrl.resolve();

              const renderResult = await renderToString(
                buildInputHtml(tagName, namedSlots),
                {
                  prettyHtml: true,
                  removeScripts: false,
                  beforeHydrate: (root) => {
                    const stencilElement = root.querySelector(tagName);
                    updateStencilElementProps(stencilElement, props);
                  },
                },
              );
              const { html } = renderResult;
              if (options?.onSsrRenderResultQrl) {
                const onSsrRenderResult = await options.onSsrRenderResultQrl.resolve();
                await onSsrRenderResult(renderResult);
              }

              // Inline-emit component styles, deduped per request so the same
              // CSS is not repeated when the same component appears multiple times.
              const inlineStylesHtml = buildInlineStylesHtml(renderResult, tagName);
              if (inlineStylesHtml) {
                yield <SSRRaw data={inlineStylesHtml} />;
              }

              // `fullDocument` option is unavailable in some Stencil versions,
              // so extract the body content manually.
              const bodyHtml =
                html.match(/<body>([\s\S]*)<\/body>/)?.[1] || html;

              const entries = collectSlotEntries(bodyHtml, namedSlots);

              if (entries.length === 0) {
                // Component has no slots at all — emit the full HTML as-is.
                yield <SSRRaw data={bodyHtml} />;
                return;
              }

              // Walk through the body HTML, interleaving SSRRaw segments with
              // Qwik <Slot /> / <Slot name="..." /> at each marker position.
              let cursor = 0;
              for (const entry of entries) {
                const markerIndex = bodyHtml.indexOf(entry.marker, cursor);
                yield <SSRRaw data={bodyHtml.slice(cursor, markerIndex)} />;
                if (entry.name) {
                  yield <Slot name={entry.name} />;
                } else {
                  yield <Slot />;
                }
                cursor = markerIndex + entry.marker.length;
              }
              // Emit any HTML that follows the last marker.
              if (cursor < bodyHtml.length) {
                yield <SSRRaw data={bodyHtml.slice(cursor)} />;
              }
            }}
          </SSRStream>
        </div>
      );
    }

    // On the client, Stencil upgrades the custom element and handles
    // rendering. Qwik projects default and named children via <Slot />.
    return (
      <div
        ref={wrapperRef}
        data-stencil-wrapper-id={wrapperId}
        {...restProps}
        style={{ display: 'contents' }}
      >
        <Slot />
        {namedSlots.map((name) => (
          <Slot name={name} key={name} />
        ))}
      </div>
    );
  });
}
