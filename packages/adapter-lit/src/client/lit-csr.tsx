import {
  Slot,
  component$,
  useSignal,
  useVisibleTask$,
  type QRL,
} from '@builder.io/qwik';

import { updateLitCSRHostProps } from './lit-csr-props.js';

const EVENT_QRL_IDS = new WeakMap<object, number>();
let eventQrlIdCounter = 0;
const PROP_VALUE_IDS = new WeakMap<object, number>();
let propValueIdCounter = 0;

function createContractError(
  code: string,
  message: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export function renderComponentCsrTag(
  options: { tagName?: unknown } = {},
): string | null {
  if (options.tagName == null) {
    return null;
  }

  if (
    typeof options.tagName !== 'string' ||
    options.tagName.trim().length === 0
  ) {
    throw createContractError(
      'QCE_LIT_RUNTIME_TAGNAME_INVALID',
      'Lit CSR render contract requires options.tagName to be a non-empty string when provided.',
    );
  }

  return options.tagName.trim();
}

function requireLitTagName(tagName: unknown): string {
  const normalizedTagName = renderComponentCsrTag({ tagName });

  if (normalizedTagName == null) {
    throw createContractError(
      'QCE_LIT_RUNTIME_TAGNAME_INVALID',
      'Lit CSR render contract requires options.tagName to be a non-empty string when provided.',
    );
  }

  return normalizedTagName;
}

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

function getEventEntries(events: LitCSRProps['events']) {
  return Object.entries(events ?? {}).filter(
    ([eventName, eventQrl]) => eventName.trim().length > 0 && Boolean(eventQrl),
  );
}

function getEventsDependencyKey(events: LitCSRProps['events']): string {
  return getEventEntries(events)
    .map(([eventName, eventQrl]) => `${eventName}:${getEventQrlId(eventQrl)}`)
    .sort()
    .join('|');
}

function getPropValueDependencyKey(value: unknown): string {
  if (value == null) {
    return String(value);
  }

  if (typeof value !== 'object' && typeof value !== 'function') {
    return `${typeof value}:${String(value)}`;
  }

  const valueObject = value as object;
  const existing = PROP_VALUE_IDS.get(valueObject);
  if (existing) {
    return `ref:${existing}`;
  }

  const next = ++propValueIdCounter;
  PROP_VALUE_IDS.set(valueObject, next);
  return `ref:${next}`;
}

function getPropsDependencyKey(props: LitCSRProps['props']): string {
  return Object.entries(props ?? {})
    .map(
      ([propName, propValue]) =>
        `${propName}:${getPropValueDependencyKey(propValue)}`,
    )
    .sort()
    .join('|');
}

type EventQrlInternal = QRL<(...args: any[]) => void> & {
  $setContainer$?: (containerEl: Element) => void;
};

export interface LitCSRProps {
  tagName: string;
  props?: Record<string, unknown>;
  events?: Record<string, QRL<(...args: any[]) => void>>;
  slots?: string[];
  [key: string]: unknown;
}

export function createLitCSRComponent() {
  return component$<LitCSRProps>((inputProps) => {
    const hostRef = useSignal<HTMLElement>();
    const { tagName, props, events, slots, ...restProps } = inputProps;
    const namedSlots = slots ?? [];
    const normalizedTagName = requireLitTagName(tagName);

    useVisibleTask$(({ track, cleanup }) => {
      const host = track(() => hostRef.value);
      const latestTagName = track(() => inputProps.tagName);
      track(() => getPropsDependencyKey(props));

      if (!host) {
        return;
      }

      let disposed = false;

      cleanup(() => {
        disposed = true;
      });

      updateLitCSRHostProps(host, props);

      const resolvedTagName = requireLitTagName(latestTagName);
      void customElements.whenDefined(resolvedTagName).then(() => {
        if (disposed) {
          return;
        }

        updateLitCSRHostProps(host, props);
      });
    });

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

    const ElementTag = normalizedTagName as any;

    return (
      <ElementTag ref={hostRef} {...restProps}>
        <Slot />
        {namedSlots.map((name) => (
          <span key={name} slot={name} style={{ display: 'contents' }}>
            <Slot name={name} />
          </span>
        ))}
      </ElementTag>
    );
  });
}
