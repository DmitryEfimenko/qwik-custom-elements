export const metadata = {
  id: 'lit',
  displayName: '@qwik-custom-elements/adapter-lit',
};

export async function probeSSR() {
  return { available: false };
}
