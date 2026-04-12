import { inlinedQrl } from '@builder.io/qwik';
import {
  createStencilSSRComponent,
  type StencilRenderToString,
} from '@qwik-custom-elements/adapter-stencil/ssr';

const stencilRenderToString: StencilRenderToString = async (input, options) => {
  const hydrateModuleId = '@qwik-custom-elements/test-stencil-lib/hydrate';
  const { renderToString } = await import(/* @vite-ignore */ hydrateModuleId);
  return renderToString(input, options);
};

export const StencilJsLibSSRComponent = createStencilSSRComponent(
  inlinedQrl(stencilRenderToString, 'stencilRenderToString'),
);
