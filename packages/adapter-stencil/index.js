export const metadata = {
  adapterId: 'stencil',
  supportedSourceTypes: ['CEM'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: null,
};

export async function probeSSR() {
  return { available: true };
}
