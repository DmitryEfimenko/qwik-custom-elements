import { inlinedQrl } from '@builder.io/qwik';
import {
  createStencilSSRComponent,
  type StencilRenderToString,
} from '@qwik-custom-elements/adapter-stencil/ssr';
import { renderToString } from '../generated/runtime-ssr.generated';

const stencilRenderToString: StencilRenderToString = renderToString;

export const StencilJsLibSSRComponent = createStencilSSRComponent(
  inlinedQrl(stencilRenderToString, 'stencilRenderToString'),
);
