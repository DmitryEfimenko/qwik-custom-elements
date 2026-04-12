import { $, useOnDocument, type QRL } from '@builder.io/qwik';

const STENCIL_CLIENT_SETUP_DONE = '__qce_stencil_client_setup_done__';
const DEFINE_CUSTOM_ELEMENTS_INPUTS = new Map<
  string,
  DefineCustomElementsInput | undefined
>();
let defineCustomElementsInputIdCounter = 0;

type DefineCustomElementsInput =
  | QRL<() => Promise<void>>
  | (() => Promise<void>);

function registerDefineCustomElementsInput(
  input?: DefineCustomElementsInput,
): string | undefined {
  if (!input) {
    return undefined;
  }

  const inputId = `stencil-client-setup-${++defineCustomElementsInputIdCounter}`;
  DEFINE_CUSTOM_ELEMENTS_INPUTS.set(inputId, input);
  return inputId;
}

async function resolveDefineCustomElements(
  input?: DefineCustomElementsInput,
): Promise<(() => Promise<void>) | undefined> {
  if (!input) {
    return undefined;
  }

  if (
    typeof input === 'object' &&
    input !== null &&
    'resolve' in input &&
    typeof (input as { resolve?: unknown }).resolve === 'function'
  ) {
    const qrlInput = input as QRL<() => Promise<void>>;
    return qrlInput.resolve();
  }

  return input as () => Promise<void>;
}

async function runStencilClientSetup(
  defineCustomElements?: () => Promise<void>,
): Promise<void> {
  // SSR emits component styles as <style sty-id="..."> in the body to prevent FOUC.
  // Before Stencil bootstrap, move these into document.head so that when
  // Stencil's addStyle() queries style[sty-id="..."], it finds them there.
  const inlineBodyStyles =
    document.querySelectorAll<HTMLStyleElement>('style[sty-id]');

  const seenContent = new Set<string>();

  for (const styleEl of inlineBodyStyles) {
    if (styleEl.parentElement !== document.head) {
      // Deduplicate by CSS content to handle cases where Stencil's
      // renderToString returns styles without proper IDs, causing
      // fallback key generation that may not be unique.
      const content = styleEl.textContent ?? '';
      if (!seenContent.has(content)) {
        document.head.appendChild(styleEl);
        seenContent.add(content);
      } else {
        // Remove duplicate CSS content
        styleEl.remove();
      }
    }
  }

  // Register custom element definitions. Stencil will reuse the promoted
  // head styles when components connect, avoiding duplicate style tags.
  if (defineCustomElements) {
    await defineCustomElements();
  }
}

function ensureStencilClientSetup(
  defineCustomElementsInput?: DefineCustomElementsInput,
): Promise<void> {
  const markerTarget = globalThis as Record<string, unknown>;
  const existingMarker = markerTarget[STENCIL_CLIENT_SETUP_DONE];

  if (existingMarker === true) {
    return Promise.resolve();
  }

  if (
    typeof existingMarker === 'object' &&
    existingMarker !== null &&
    'then' in existingMarker &&
    typeof (existingMarker as { then?: unknown }).then === 'function'
  ) {
    return existingMarker as Promise<void>;
  }

  const setupPromise = (async () => {
    const defineCustomElements = await resolveDefineCustomElements(
      defineCustomElementsInput,
    );

    await runStencilClientSetup(defineCustomElements);
  })();

  markerTarget[STENCIL_CLIENT_SETUP_DONE] = setupPromise;

  return setupPromise
    .then(() => {
      markerTarget[STENCIL_CLIENT_SETUP_DONE] = true;
    })
    .catch((error) => {
      delete markerTarget[STENCIL_CLIENT_SETUP_DONE];
      throw error;
    });
}

async function executeStencilClientSetup(
  defineCustomElementsInputId?: string,
  fallbackInput?: DefineCustomElementsInput,
): Promise<void> {
  const registeredInput =
    defineCustomElementsInputId == null
      ? undefined
      : DEFINE_CUSTOM_ELEMENTS_INPUTS.get(defineCustomElementsInputId);

  const resolvedInput = registeredInput ?? fallbackInput;

  await ensureStencilClientSetup(resolvedInput).catch((error) => {
    console.error(error);
  });
}

/**
 * Creates a client-side setup hook for Stencil components.
 * Promotes SSR-emitted styles into document head, then registers custom elements.
 */
export function createStencilClientSetup(
  defineCustomElementsInput?: DefineCustomElementsInput,
) {
  const defineCustomElementsInputId = registerDefineCustomElementsInput(
    defineCustomElementsInput,
  );
  const qrlFallbackInput =
    defineCustomElementsInput != null &&
    '$symbol$' in Object(defineCustomElementsInput)
      ? (defineCustomElementsInput as QRL<() => Promise<void>>)
      : undefined;

  const runSetup$ = $(async () => {
    await executeStencilClientSetup(
      defineCustomElementsInputId,
      qrlFallbackInput,
    );
  });

  const useStencilClientSetup = () => {
    // Register for full page loads and also run immediately when mounted
    // after the load event has already fired (client navigation/dev timing).
    useOnDocument('load', runSetup$);

    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      void executeStencilClientSetup(
        defineCustomElementsInputId,
        qrlFallbackInput,
      );
    }
  };

  return useStencilClientSetup;
}
