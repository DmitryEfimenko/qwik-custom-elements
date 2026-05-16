import { $, useOnDocument, type QRL } from '@builder.io/qwik';

const LIT_CSR_CLIENT_SETUP_DONE = '__qce_lit_csr_client_setup_done__';

function ensureLitCSRClientSetup(
  importLibraryQrl?: QRL<() => Promise<void>>,
): Promise<void> {
  const markerTarget = globalThis as Record<string, unknown>;
  const existingMarker = markerTarget[LIT_CSR_CLIENT_SETUP_DONE];

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
    if (importLibraryQrl) {
      const fn = await importLibraryQrl.resolve();
      await fn();
    }
  })();

  markerTarget[LIT_CSR_CLIENT_SETUP_DONE] = setupPromise;

  return setupPromise
    .then(() => {
      markerTarget[LIT_CSR_CLIENT_SETUP_DONE] = true;
    })
    .catch((error: unknown) => {
      delete markerTarget[LIT_CSR_CLIENT_SETUP_DONE];
      throw error;
    });
}

async function executeLitCSRClientSetup(
  importLibraryQrl?: QRL<() => Promise<void>>,
): Promise<void> {
  await ensureLitCSRClientSetup(importLibraryQrl).catch((error: unknown) => {
    console.error(error);
  });
}

/**
 * Creates a client-side setup hook for Lit CSR components.
 *
 * The returned hook registers a `readystatechange` listener that calls the
 * provided QRL to load and define the custom elements. The setup is idempotent
 * and runs at most once per page load, tracked via a `globalThis` marker.
 *
 * Call the returned hook inside a Qwik component to activate element loading.
 */
export function createLitCSRClientSetup(
  importLibraryQrl?: QRL<() => Promise<void>>,
) {
  const runSetup$ = $(async () => {
    await executeLitCSRClientSetup(importLibraryQrl);
  });

  const useLitCSRClientSetup = () => {
    useOnDocument('readystatechange', runSetup$);

    // Also run immediately when mounted after the document is already past the
    // loading state (client navigation or dev fast-refresh timing).
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      void executeLitCSRClientSetup(importLibraryQrl);
    }
  };

  return useLitCSRClientSetup;
}
