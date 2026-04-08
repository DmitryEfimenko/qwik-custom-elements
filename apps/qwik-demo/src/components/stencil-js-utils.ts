import type { StencilRenderToStringOptions } from '@qwik-custom-elements/adapter-stencil/ssr';

export async function defineCustomElements() {
  // Use the package export directly from the local workspace fixture library.
  const { defineCustomElements: defineCustomElementsFromLoader } = await import(
    '@qwik-custom-elements/test-stencil-lib/loader'
  );
  await defineCustomElementsFromLoader();
}

export async function renderToString(
  input: string,
  options?: StencilRenderToStringOptions,
) {
  if (!import.meta.env.SSR) {
    return { html: input };
  }

  // Use the package export directly from the local workspace fixture library.
  const hydrateModuleId = '@qwik-custom-elements/test-stencil-lib/hydrate';
  const { renderToString: stencilRenderToString } = await import(
    /* @vite-ignore */ hydrateModuleId
  );
  const result = await stencilRenderToString(input, options);

  return {
    html: result.html ?? '',
    styles: result.styles,
    components: result.components,
  };
}
