import { $, useOnDocument, type QRL } from '@builder.io/qwik';

/**
 * Creates a client-side setup hook for Stencil components.
 * Promotes SSR-emitted styles into document head, then registers custom elements.
 */
export function createStencilClientSetup(
  defineCustomElementsQrl?: QRL<() => Promise<void>>,
) {
  const useStencilClientSetup = () => {
    useOnDocument(
      'load',
      $(async () => {
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
        if (defineCustomElementsQrl) {
          const defineCustomElements = await defineCustomElementsQrl.resolve();
          await defineCustomElements();
        }
      }),
    );
  };

  return useStencilClientSetup;
}
