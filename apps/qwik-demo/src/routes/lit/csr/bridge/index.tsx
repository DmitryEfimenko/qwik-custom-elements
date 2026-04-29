import { $, component$, useOnDocument } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { QwikDeButtonCsrTagFromBridge } from '../../../../generated/lit/csr/de-button';

export default component$(() => {
  useOnDocument(
    'readystatechange',
    $(() => {
      void import('@qwik-custom-elements/test-lit-lib');
    }),
  );

  const bridgeTag = QwikDeButtonCsrTagFromBridge;
  const bridgeMarkup = bridgeTag
    ? `<${bridgeTag} id="first-lit-button"></${bridgeTag}>`
    : null;

  return (
    <>
      <h1>Lit CSR Bridge Validation</h1>
      <p id="lit-render-status">Generated Lit CSR bridge route active.</p>

      <div
        id="lit-first-wrapper"
        dangerouslySetInnerHTML={bridgeMarkup ?? undefined}
      />
    </>
  );
});

export const head: DocumentHead = {
  title: 'Lit CSR Bridge Validation',
};
