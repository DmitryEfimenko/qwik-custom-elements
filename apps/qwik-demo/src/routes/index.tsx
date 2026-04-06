import { component$ } from '@builder.io/qwik';
import { type DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <section>
      <h1>Qwik Demo</h1>
      <p>This app is running with a minimal baseline page.</p>
      <p>
        POC-specific Stencil runtime wiring has been removed from the home
        route.
      </p>
    </section>
  );
});

export const head: DocumentHead = {
  title: 'Welcome to Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
};
