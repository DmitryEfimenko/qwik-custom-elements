import { $, component$, useOnDocument, useSignal } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { TestLitLibCSRBridgeComponent } from '../../../../generated/lit/csr/runtime';

export default component$(() => {
  const tripleClickCount = useSignal(0);

  useOnDocument(
    'readystatechange',
    $(() => {
      void import('@qwik-custom-elements/test-lit-lib');
    }),
  );

  const handleTripleClick$ = $(() => {
    tripleClickCount.value += 1;
  });

  return (
    <>
      <h1>Lit CSR Bridge Validation</h1>
      <p id="lit-render-status">Generated Lit CSR bridge route active.</p>
      <p id="lit-triple-click-count">
        Triple click count: {tripleClickCount.value}
      </p>

      <div id="lit-first-wrapper">
        <TestLitLibCSRBridgeComponent
          tagName="de-button"
          props={{ id: 'first-lit-button', size: 'lg' }}
          events={{ tripleClick: handleTripleClick$ }}
        >
          First Lit CSR Button
        </TestLitLibCSRBridgeComponent>
      </div>

      <div id="lit-alert-wrapper">
        <TestLitLibCSRBridgeComponent tagName="de-alert" slots={['footer']}>
          <span>Alert body content</span>
          <span q:slot="footer">Alert footer content</span>
        </TestLitLibCSRBridgeComponent>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Lit CSR Bridge Validation',
};
