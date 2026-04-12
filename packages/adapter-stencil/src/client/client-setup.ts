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
  if (markerTarget[STENCIL_CLIENT_SETUP_DONE] === true) {
    return Promise.resolve();
  }
  markerTarget[STENCIL_CLIENT_SETUP_DONE] = true;
  console.log('stencilClientSetup:executedOnce');

  return (async () => {
    const defineCustomElements = await resolveDefineCustomElements(
      defineCustomElementsInput,
    );

    await runStencilClientSetup(defineCustomElements);
  })();
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

  const runSetup$ = $(async () => {
    const registeredInput =
      defineCustomElementsInputId == null
        ? undefined
        : DEFINE_CUSTOM_ELEMENTS_INPUTS.get(defineCustomElementsInputId);

    await ensureStencilClientSetup(registeredInput).catch((error) => {
      console.error(error);
    });
  });

  const useStencilClientSetup = () => {
    // Use a single listener for full page loads.
    // The global marker still guarantees setup work runs once.
    useOnDocument('load', runSetup$);
  };

  return useStencilClientSetup;
}
