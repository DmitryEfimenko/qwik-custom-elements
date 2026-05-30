import { $, component$, useSignal, useStylesScoped$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import {
  TestLitLibSSRBridgeComponent,
  useTestLitLibSSRClientSetup,
} from '../../../../generated/lit/ssr/runtime';
import styles from './index.scss?inline';

export default component$(() => {
  useStylesScoped$(styles);

  const buttonSize = useSignal<'md' | 'lg'>('md');
  const firstAlphaCount = useSignal(0);
  const firstBetaCount = useSignal(0);
  const secondCount = useSignal(0);
  const activeHandler = useSignal<'alpha' | 'beta'>('alpha');

  useTestLitLibSSRClientSetup();

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
      <h1>Lit SSR Bridge Validation</h1>
      <p id="lit-render-status">First Lit render path active.</p>

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
        <div id="first-lit-wrapper">
          <TestLitLibSSRBridgeComponent
            tagName="de-button"
            props={{ size: buttonSize.value }}
            events={firstEvents}
          >
            First Lit SSR Button
          </TestLitLibSSRBridgeComponent>
        </div>

        <div id="second-lit-wrapper">
          <TestLitLibSSRBridgeComponent
            tagName="de-button"
            props={{ size: buttonSize.value }}
            events={{ tripleClick: handleSecond$ }}
          >
            Second Lit SSR Button
          </TestLitLibSSRBridgeComponent>
        </div>
      </div>

      <div id="lit-alert-wrapper">
        <TestLitLibSSRBridgeComponent
          tagName="de-alert"
          props={{ heading: 'Validation Alert' }}
          slots={['footer']}
        >
          <span>Alert body content</span>
          <span q:slot="footer">Alert footer content</span>
        </TestLitLibSSRBridgeComponent>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Lit SSR Bridge Validation',
};
