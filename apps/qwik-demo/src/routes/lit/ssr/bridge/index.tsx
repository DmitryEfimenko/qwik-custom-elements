import { $, component$, useOnDocument } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';


export default component$(() => {
  useOnDocument('readystatechange', $(() => {
    void import('@qwik-custom-elements/test-lit-lib');
  }));

  return (
    <>
      <h1>Lit SSR Bridge Validation</h1>
      <p id="lit-render-status">First Lit render path active.</p>

      <div id="lit-first-wrapper">
        <de-button id="first-lit-button">First Lit Button</de-button>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Lit SSR Bridge Validation',
};
