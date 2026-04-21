import { $, component$, useSignal } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

import {
  GeneratedStencilCSRComponent,
  useGeneratedStencilClientSetup,
} from '../../../../generated/runtime-csr.generated';

export default component$(() => {
  const buttonSize = useSignal<'md' | 'lg'>('md');
  const firstAlphaCount = useSignal(0);
  const firstBetaCount = useSignal(0);
  const secondCount = useSignal(0);
  const activeHandler = useSignal<'alpha' | 'beta'>('alpha');
  useGeneratedStencilClientSetup();

  const handleFirstAlpha$ = $(() => {
    firstAlphaCount.value += 1;
  });

  const handleFirstBeta$ = $(() => {
    firstBetaCount.value += 1;
  });

  const handleSecond$ = $(() => {
    secondCount.value += 1;
  });

  const toggleSize$ = $(() => {
    buttonSize.value = buttonSize.value === 'md' ? 'lg' : 'md';
  });

  const toggleHandler$ = $(() => {
    activeHandler.value = activeHandler.value === 'alpha' ? 'beta' : 'alpha';
  });

  const firstEvents = {
    tripleClick:
      activeHandler.value === 'alpha' ? handleFirstAlpha$ : handleFirstBeta$,
  };

  return (
    <>
      <h1>Stencil CSR Events Validation</h1>

      <p id="active-handler">Active handler: {activeHandler.value}</p>
      <p id="first-alpha-count">First alpha count: {firstAlphaCount.value}</p>
      <p id="first-beta-count">First beta count: {firstBetaCount.value}</p>
      <p id="second-count">Second count: {secondCount.value}</p>
      <p id="button-size">Button size: {buttonSize.value}</p>

      <button id="toggle-handler" onClick$={toggleHandler$}>
        Toggle first handler
      </button>
      <button id="toggle-size" onClick$={toggleSize$}>
        Toggle button size
      </button>

      <button
        id="alpha-handler-warmup"
        onClick$={handleFirstAlpha$}
        style={{ display: 'none' }}
      >
        alpha handler warmup
      </button>
      <button
        id="beta-handler-warmup"
        onClick$={handleFirstBeta$}
        style={{ display: 'none' }}
      >
        beta handler warmup
      </button>

      <div id="buttons">
        <div id="first-stencil-wrapper">
          <GeneratedStencilCSRComponent
            tagName="de-button"
            props={{ size: buttonSize.value }}
            events={firstEvents}
          >
            First CSR Button
          </GeneratedStencilCSRComponent>
        </div>

        <div id="second-stencil-wrapper">
          <GeneratedStencilCSRComponent
            tagName="de-button"
            props={{ size: buttonSize.value }}
            events={{ tripleClick: handleSecond$ }}
          >
            Second CSR Button
          </GeneratedStencilCSRComponent>
        </div>
      </div>

      <div id="alert-stencil-wrapper">
        <GeneratedStencilCSRComponent
          tagName="de-alert"
          props={{ heading: 'Validation Alert' }}
          slots={['footer']}
        >
          <span>Alert body content</span>
          <span q:slot="footer">Alert footer content</span>
        </GeneratedStencilCSRComponent>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Stencil CSR Events Validation',
};
