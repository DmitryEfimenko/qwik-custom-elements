import { $, component$, useSignal } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";
import {
  DeButton,
  useGeneratedStencilClientSetup
} from '../components/generated/stencil';

export default component$(() => {
  const size = useSignal<'md' | 'lg'>('md');
  useGeneratedStencilClientSetup();

  const changeSize$ = $(() => {
    size.value = size.value === 'md' ? 'lg' : 'md';
  });
  
  return (
    <>
      <div>
        <p>
          Client-side rendered.<br />
          Click handler toggles size on all buttons on the page.
        </p>

        {/* <de-button size={size.value} onClick$={changeSize$}>Rendered via CSR</de-button> */}
      </div>

      <hr />

      <div>
        <p>
          Server-side rendered (check Network request response to verify).<br />
          Click handler toggles size on all buttons on the page.
        </p>

        <DeButton size={size.value} onClick$={changeSize$} onTripleClick$={() => { console.log('triple') }}>
          Rendered via SSR
        </DeButton>
      </div>

      <hr />

      {/* <div>
        <p>
          Server-side rendered alert with slotted content.<br />
          The slot contains another server-side rendered button.
        </p>

        <DeAlert heading='V2 Alert'>
          <p>Body content</p>
          <DeButton size={size.value} onClick$={changeSize$}>
            Rendered via SSR
          </DeButton>
          <span q:slot="footer">Footer content (named slot)</span>
        </DeAlert>
      </div> */}
    </>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
