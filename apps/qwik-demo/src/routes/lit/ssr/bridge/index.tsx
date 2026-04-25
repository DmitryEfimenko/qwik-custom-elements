import { component$, isBrowser, jsx, useTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

import { QwikDeButton } from '../../../../generated/lit/ssr';

export default component$(() => {
  useTask$(() => {
    if (!isBrowser) {
      return;
    }

    void import('@qwik-custom-elements/test-lit-lib');
  });

  return (
    <>
      <h1>Lit SSR Bridge Validation</h1>
      <p id="lit-render-status">First Lit render path active.</p>

      <div id="lit-first-wrapper">
        {jsx(QwikDeButton, {
          id: 'first-lit-button',
          children: 'First Lit Button',
        })}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Lit SSR Bridge Validation',
};
