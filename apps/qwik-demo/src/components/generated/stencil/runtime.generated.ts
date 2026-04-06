import { $ } from '@builder.io/qwik';
import { createStencilSSRComponent } from '../../stencil-js-qwik-ssr/stencil-ssr';
import { createStencilClientSetup } from '../../stencil-js-qwik-ssr/client-setup';
import type { StencilRenderToStringOptions } from '../../stencil-js-qwik-ssr/model';
import {
  defineCustomElements as runtimeDefineCustomElements,
  renderToString as runtimeRenderToString,
} from '../../stencil-js-utils';

export const defineCustomElements = async (): Promise<void> => {
  await Promise.resolve(runtimeDefineCustomElements());
};

export const renderToString = async (
  input: string,
  options?: StencilRenderToStringOptions,
) => {
  return Promise.resolve(runtimeRenderToString(input, options));
};

export const defineCustomElementsQrl = $(defineCustomElements);
export const stencilRenderToStringQrl = $(renderToString);
export const useGeneratedStencilClientSetup =
  createStencilClientSetup(defineCustomElementsQrl);
export const GeneratedStencilComponent =
  createStencilSSRComponent(stencilRenderToStringQrl);
