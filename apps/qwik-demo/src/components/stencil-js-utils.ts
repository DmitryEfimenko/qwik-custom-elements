import type { StencilRenderToStringOptions } from './stencil-js-qwik-ssr/model';

export async function defineCustomElements() {
  // With a regular npm-installed Stencil package, this is usually much simpler:
  // import { defineCustomElements } from '<package>/loader' and call it directly.
  // This demo loads copied output targets instead, so we can avoid npm-link-specific
  // Vite server/fs configuration complexity while still showing Stencil in Qwik.
  const stencilLoaderUrl = import.meta.env.DEV
    ? __STENCIL_LOADER_DEV_URL__
    : '/stencil-runtime/esm/loader.js';
  const stencilResourcesUrl = import.meta.env.DEV
    ? __STENCIL_RESOURCES_DEV_URL__
    : '/stencil-runtime/esm/';
  const { defineCustomElements: defineCustomElementsFromLoader } = await import(
    /* @vite-ignore */ stencilLoaderUrl
  );

  await defineCustomElementsFromLoader(undefined, {
    resourcesUrl: stencilResourcesUrl,
  });
}

export async function renderToString(
  input: string,
  options?: StencilRenderToStringOptions,
) {
  if (!import.meta.env.SSR) {
    return { html: input };
  }

  // With regular npm-installed components, this would typically be a direct
  // package import. In this demo we load the copied hydrate output target so
  // SSR does not depend on npm link resolution behavior.
  const cwdPosix = process.cwd().replace(/\\/g, '/');
  const hydrateModuleId = encodeURI(
    `file:///${cwdPosix}/public/stencil-runtime/hydrate/index.mjs`,
  );
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
