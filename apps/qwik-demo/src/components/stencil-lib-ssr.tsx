import { $ } from '@builder.io/qwik';
import {
  createStencilClientSetup,
  createStencilSSRComponent,
} from './stencil-js-qwik-ssr';
// in demo, there's a need to import these via some utilities
// to avoid vite errors. In actual apps, these would typically
// be direct imports from the Stencil package as shown below:
// import { defineCustomElements } from 'stencil-lib/loader';
// import { renderToString } from 'stencil-lib/hydrate';
import { defineCustomElements, renderToString } from './stencil-js-utils';

export const StencilJsLibSSRComponent = createStencilSSRComponent($(renderToString));

export const useStencilClientSetup = createStencilClientSetup($(defineCustomElements));
