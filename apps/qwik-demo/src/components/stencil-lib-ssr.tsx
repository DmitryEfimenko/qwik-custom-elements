import { inlinedQrl } from '@builder.io/qwik';
import {
  createStencilClientSetup,
  createStencilSSRComponent,
  type StencilRenderToStringOptions,
} from '@qwik-custom-elements/adapter-stencil/ssr';
import { defineCustomElements } from '@qwik-custom-elements/test-stencil-lib/loader';

async function renderToString(
  input: string,
  options?: StencilRenderToStringOptions,
) {
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

async function defineCustomElementsAsync() {
  await Promise.resolve(defineCustomElements());
}

export const StencilJsLibSSRComponent = createStencilSSRComponent(
  inlinedQrl(renderToString, 'renderToString'),
);

export const useStencilClientSetup = createStencilClientSetup(
  inlinedQrl(defineCustomElementsAsync, 'defineCustomElementsAsync'),
);
