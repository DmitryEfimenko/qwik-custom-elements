export const metadata = {
  id: 'stencil',
  displayName: '@qwik-custom-elements/adapter-stencil',
};

export async function probeSSR() {
  return { available: true };
}
