import { $, useOnDocument, type QRL } from '@builder.io/qwik';

const LIT_SSR_CLIENT_SETUP_DONE = '__qce_lit_ssr_client_setup_done__';

function ensureLitSSRClientSetup(
  importLibraryQrl?: QRL<() => Promise<void>>,
): Promise<void> {
  const markerTarget = globalThis as Record<string, unknown>;
  const existingMarker = markerTarget[LIT_SSR_CLIENT_SETUP_DONE];

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
    // Must load hydrate-support BEFORE custom elements are defined so that
    // Lit can reuse the existing Declarative Shadow DOM rather than
    // re-rendering and producing a duplicate shadow tree.
    await import('@qwik-custom-elements/adapter-lit/ssr-client');

    if (importLibraryQrl) {
      const fn = await importLibraryQrl.resolve();
      await fn();
    }
  })();

  markerTarget[LIT_SSR_CLIENT_SETUP_DONE] = setupPromise;

  return setupPromise
    .then(() => {
      markerTarget[LIT_SSR_CLIENT_SETUP_DONE] = true;
    })
    .catch((error: unknown) => {
      delete markerTarget[LIT_SSR_CLIENT_SETUP_DONE];
      throw error;
    });
}

async function executeLitSSRClientSetup(
  importLibraryQrl?: QRL<() => Promise<void>>,
): Promise<void> {
  await ensureLitSSRClientSetup(importLibraryQrl).catch((error: unknown) => {
    console.error(error);
  });
}

/**
 * Creates a client-side setup hook for Lit SSR components.
 *
 * The returned hook registers a `readystatechange` listener that:
 * 1. Loads `@lit-labs/ssr-client/lit-element-hydrate-support.js` first so
 *    existing Declarative Shadow DOM roots are reused instead of duplicated.
 * 2. Then calls the provided QRL to load and define the custom elements.
 *
 * Call the returned hook inside a Qwik component to activate hydration.
 */
export function createLitSSRClientSetup(
  importLibraryQrl?: QRL<() => Promise<void>>,
) {
  const runSetup$ = $(async () => {
    await executeLitSSRClientSetup(importLibraryQrl);
  });

  const useLitSSRClientSetup = () => {
    useOnDocument('readystatechange', runSetup$);

    // Also run immediately when mounted after the document is already past the
    // loading state (client navigation or dev fast-refresh timing).
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      void executeLitSSRClientSetup(importLibraryQrl);
    }
  };

  return useLitSSRClientSetup;
}
