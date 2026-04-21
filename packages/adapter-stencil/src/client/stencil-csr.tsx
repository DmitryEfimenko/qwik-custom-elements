import {
  Slot,
  component$,
  useSignal,
  useVisibleTask$,
  type QRL,
} from '@builder.io/qwik';

const EVENT_QRL_IDS = new WeakMap<object, number>();
let eventQrlIdCounter = 0;

function getEventQrlId(qrl: unknown): number {
  if (!qrl || (typeof qrl !== 'object' && typeof qrl !== 'function')) {
    return -1;
  }

  const qrlObject = qrl as object;
  const existing = EVENT_QRL_IDS.get(qrlObject);
  if (existing) {
    return existing;
  }

  const next = ++eventQrlIdCounter;
  EVENT_QRL_IDS.set(qrlObject, next);
  return next;
}

function getEventEntries(events: StencilCSRProps['events']) {
  return Object.entries(events ?? {}).filter(
    ([eventName, eventQrl]) => eventName.trim().length > 0 && Boolean(eventQrl),
  );
}

function getEventsDependencyKey(events: StencilCSRProps['events']): string {
  return getEventEntries(events)
    .map(([eventName, eventQrl]) => `${eventName}:${getEventQrlId(eventQrl)}`)
    .sort()
    .join('|');
}

type EventQrlInternal = QRL<(...args: any[]) => void> & {
  $setContainer$?: (containerEl: Element) => void;
};

export interface StencilCSRProps {
  tagName: string;
  props?: Record<string, unknown>;
  events?: Record<string, QRL<(...args: any[]) => void>>;
  slots?: string[];
  [key: string]: unknown;
}

export function createStencilCSRComponent() {
  return component$<StencilCSRProps>(
    ({ tagName, props, events, slots, ...restProps }) => {
      const hostRef = useSignal<HTMLElement>();
      const namedSlots = slots ?? [];

      useVisibleTask$(({ track, cleanup }) => {
        const host = track(() => hostRef.value);
        const eventsDependencyKey = track(() => getEventsDependencyKey(events));

        if (!host) {
          return;
        }

        const eventEntries = getEventEntries(events);
        if (eventEntries.length === 0 || eventsDependencyKey.length === 0) {
          return;
        }

        let disposed = false;
        const listeners: Array<{ eventName: string; listener: EventListener }> =
          [];

        cleanup(() => {
          disposed = true;
          for (const { eventName, listener } of listeners) {
            host.removeEventListener(eventName, listener);
          }
        });

        for (const [eventName, eventQrl] of eventEntries) {
          const listener: EventListener = (event) => {
            const qrl = eventQrl as EventQrlInternal;
            const containerEl = host.closest('[q\\:container]');
            if (containerEl) {
              qrl.$setContainer$?.(containerEl);
            }

            const result = eventQrl(event, host);
            void Promise.resolve(result).catch((error) => {
              console.error(error);
            });
          };

          if (disposed) {
            return;
          }

          host.addEventListener(eventName, listener);
          listeners.push({ eventName, listener });
        }
      });

      const ElementTag = tagName as any;

      return (
        <ElementTag ref={hostRef} {...(props ?? {})} {...restProps}>
          <Slot />
          {namedSlots.map((name) => (
            <Slot name={name} key={name} />
          ))}
        </ElementTag>
      );
    },
  );
}
