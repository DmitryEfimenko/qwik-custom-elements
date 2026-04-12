import { $ } from '@builder.io/qwik';
import { createStencilClientSetup } from '@qwik-custom-elements/adapter-stencil/client';
import { defineCustomElements } from '@qwik-custom-elements/test-stencil-lib/loader';

const defineCustomElementsAsync = async () => {
  await Promise.resolve(defineCustomElements());
};

export const useStencilClientSetup = createStencilClientSetup(
  $(defineCustomElementsAsync),
);
