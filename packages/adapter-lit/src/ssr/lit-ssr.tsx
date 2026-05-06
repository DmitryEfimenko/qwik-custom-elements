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
import { updateLitCSRHostProps } from '../client/lit-csr-props.js';

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

type EventQrlInternal = QRL<(...args: any[]) => void> & {
  $setContainer$?: (containerEl: Element) => void;
};

function getEventEntries(events: LitSSRProps['events']) {
  return Object.entries(events ?? {}).filter(
    ([eventName, eventQrl]) => eventName.trim().length > 0 && Boolean(eventQrl),
  );
}

function getEventsDependencyKey(events: LitSSRProps['events']): string {
  return getEventEntries(events)
    .map(([eventName, eventQrl]) => `${eventName}:${getEventQrlId(eventQrl)}`)
    .sort()
    .join('|');
}

function getWrapperElement(wrapperId: string): HTMLDivElement | undefined {
  if (!isBrowser) return undefined;
  return (
    document.querySelector<HTMLDivElement>(
      `[data-lit-wrapper-id="${wrapperId}"]`,
    ) ?? undefined
  );
}

function getLitElement(
  wrapper: HTMLDivElement | undefined,
  tagName: string,
): HTMLElement | undefined {
  return wrapper?.querySelector<HTMLElement>(tagName) ?? undefined;
}

function serializePropsToAttributes(props: Record<string, unknown>): string {
  return Object.entries(props)
    .filter(
      ([key, value]) =>
        key.trim().length > 0 && isSerializableAttributeValue(value),
    )
    .map(([key, value]) => {
      if (value === true) {
        return key;
      }
      return `${key}=${JSON.stringify(String(value))}`;
    })
    .join(' ');
}

function isSerializableAttributeValue(
  value: unknown,
): value is string | number | boolean {
  if (value == null) {
    return false;
  }
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export interface LitSSRProps {
  tagName: string;
  props?: Record<string, unknown>;
  /**
   * Optional custom-event names exposed by the Lit element.
   * Keys are native event names; values are Qwik QRL handlers.
   */
  events?: Record<string, QRL<(...args: any[]) => void>>;
  /**
   * Named slot names exposed by the Lit element (not including the default slot).
   */
  slots?: string[];
  [key: string]: unknown;
}

/**
 * Creates a Qwik component that renders a Lit custom element with SSR support.
 * On the server, uses `@lit-labs/ssr` to render the element with its shadow DOM
 * as declarative shadow DOM (DSD). On the client, the element self-hydrates and
 * Qwik wires props and events.
 */
export function createLitSSRComponent() {
  return component$<LitSSRProps>(
    ({ tagName, props, events, slots, ...restProps }) => {
      const wrapperRef = useSignal<HTMLDivElement | undefined>(undefined);
      const wrapperId = useId();
      const clientReady = useSignal(false);
      const namedSlots = slots ?? [];

      useOnDocument(
        'qinit',
        $(() => {
          clientReady.value = true;
        }),
      );

      // Sync props to the Lit element on the client whenever they change.
      useTask$(({ track }) => {
        const trackedProps = track(() => props);
        if (!isBrowser) return;
        const wrapper = getWrapperElement(wrapperId) ?? wrapperRef.value;
        const litEl = getLitElement(wrapper, tagName);
        updateLitCSRHostProps(litEl, trackedProps);
      });

      // Wire event listeners after the client is ready (post-qinit).
      useTask$(({ cleanup, track }) => {
        const ready = track(() => clientReady.value);
        const eventsDependencyKey = track(() => getEventsDependencyKey(events));

        if (!isBrowser || !ready) return;

        const wrapper = getWrapperElement(wrapperId) ?? wrapperRef.value;
        const litEl = getLitElement(wrapper, tagName);
        const eventEntries = getEventEntries(events);

        if (
          !litEl ||
          eventEntries.length === 0 ||
          eventsDependencyKey.length === 0
        ) {
          return;
        }

        let disposed = false;
        const listeners: Array<{
          eventName: string;
          listener: EventListener;
        }> = [];

        cleanup(() => {
          disposed = true;
          for (const { eventName, listener } of listeners) {
            litEl.removeEventListener(eventName, listener);
          }
        });

        for (const [eventName, eventQrl] of eventEntries) {
          const listener: EventListener = (event) => {
            const qrl = eventQrl as EventQrlInternal;
            const containerEl = litEl.closest('[q\\:container]');
            if (containerEl) {
              qrl.$setContainer$?.(containerEl);
            }
            void Promise.resolve(eventQrl(event, litEl)).catch(console.error);
          };

          if (disposed) return;

          litEl.addEventListener(eventName, listener);
          listeners.push({ eventName, listener });
        }
      });

      if (isServer) {
        return (
          <div
            ref={wrapperRef}
            data-lit-wrapper-id={wrapperId}
            style={{ display: 'contents' }}
            {...(restProps as Record<string, unknown>)}
          >
            <SSRStream>
              {async function* () {
                // Dynamic imports ensure these server-only packages are not
                // bundled into client code.
                const { render } = await import('@lit-labs/ssr');
                const { html } = await import('lit');

                const propsHtml = serializePropsToAttributes(props ?? {});
                const staticTemplate = propsHtml
                  ? `<${tagName} ${propsHtml}></${tagName}>`
                  : `<${tagName}></${tagName}>`;

                // Build a TemplateResult from a static string so @lit-labs/ssr
                // can invoke registered element renderers and produce DSD.
                // unsafeHTML() bypasses element renderer lookup; calling html()
                // directly with a static-strings array does not.
                const strings = Object.assign([staticTemplate], {
                  raw: [staticTemplate],
                }) as unknown as TemplateStringsArray;

                // Collect the full SSR output from @lit-labs/ssr.
                let fullHtml = '';
                for (const chunk of render(html(strings))) {
                  fullHtml += String(chunk);
                }

                // Inject Qwik slot content as light-DOM children of the element
                // (before the closing tag) so the shadow DOM <slot> outlets
                // can pick them up after client hydration.
                const closingTag = `</${tagName}>`;
                const closingTagIdx = fullHtml.lastIndexOf(closingTag);

                if (closingTagIdx === -1) {
                  // No closing tag found — emit as-is and append slot content.
                  yield <SSRRaw data={fullHtml} />;
                  yield <Slot />;
                  for (const slotName of namedSlots) {
                    yield <Slot name={slotName} />;
                  }
                } else {
                  // Emit everything before the closing tag.
                  yield <SSRRaw data={fullHtml.slice(0, closingTagIdx)} />;
                  // Project default and named slot content.
                  yield <Slot />;
                  for (const slotName of namedSlots) {
                    yield <Slot name={slotName} />;
                  }
                  // Emit the closing tag.
                  yield <SSRRaw data={closingTag} />;
                }
              }}
            </SSRStream>
          </div>
        );
      }

      // Client path: the Lit element is already present in the DOM from SSR and
      // will self-hydrate using the declarative shadow DOM. Qwik projects slot
      // content into the light DOM via <Slot />. Prop sync and event wiring are
      // handled by the useTask$ hooks above.
      return (
        <div
          ref={wrapperRef}
          data-lit-wrapper-id={wrapperId}
          style={{ display: 'contents' }}
          {...(restProps as Record<string, unknown>)}
        >
          <Slot />
          {namedSlots.map((name) => (
            <Slot name={name} key={name} />
          ))}
        </div>
      );
    },
  );
}
