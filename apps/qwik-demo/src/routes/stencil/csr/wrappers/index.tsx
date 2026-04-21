import {
  $,
  Slot,
  component$,
  useSignal,
  useVisibleTask$,
  type QRL,
} from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

import { useGeneratedStencilClientSetup } from '../../../../generated/runtime-csr.generated';

interface CsrDeButtonProps {
  size?: 'sm' | 'md' | 'lg';
  onTripleClick$?: QRL<(event: CustomEvent<MouseEvent>) => void>;
}

const CsrDeButton = component$<CsrDeButtonProps>((props) => {
  const hostRef = useSignal<HTMLDeButtonElement>();

  useGeneratedStencilClientSetup();

  useVisibleTask$(({ track, cleanup }) => {
    track(() => hostRef.value);
    track(() => props.onTripleClick$);

    const host = hostRef.value;
    const handlerQrl = props.onTripleClick$;
    if (!host || !handlerQrl) {
      return;
    }

    const handleTripleClick = (event: Event) => {
      void handlerQrl
        .resolve()
        .then((handler) => handler(event as CustomEvent<MouseEvent>));
    };

    host.addEventListener('tripleClick', handleTripleClick);
    cleanup(() => {
      host.removeEventListener('tripleClick', handleTripleClick);
    });
  });

  return (
    <de-button ref={hostRef} size={props.size}>
      <Slot />
    </de-button>
  );
});

interface CsrDeAlertProps {
  heading?: string;
}

const CsrDeAlert = component$<CsrDeAlertProps>((props) => {
  useGeneratedStencilClientSetup();

  return (
    <de-alert heading={props.heading}>
      <Slot />
    </de-alert>
  );
});

export default component$(() => {
  const buttonSize = useSignal<'md' | 'lg'>('md');
  const firstAlphaCount = useSignal(0);
  const firstBetaCount = useSignal(0);
  const secondCount = useSignal(0);
  const activeHandler = useSignal<'alpha' | 'beta'>('alpha');

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

  const firstTripleClickHandler$ =
    activeHandler.value === 'alpha' ? handleFirstAlpha$ : handleFirstBeta$;

  return (
    <>
      <h1>Stencil CSR Wrappers Validation</h1>

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
          <CsrDeButton
            size={buttonSize.value}
            onTripleClick$={firstTripleClickHandler$}
          >
            First CSR Button
          </CsrDeButton>
        </div>

        <div id="second-stencil-wrapper">
          <CsrDeButton size={buttonSize.value} onTripleClick$={handleSecond$}>
            Second CSR Button
          </CsrDeButton>
        </div>
      </div>

      <div id="alert-stencil-wrapper">
        <CsrDeAlert heading="Validation Alert">
          <span>Alert body content</span>
          <span q:slot="footer">Alert footer content</span>
        </CsrDeAlert>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Stencil CSR Wrappers Validation',
};
