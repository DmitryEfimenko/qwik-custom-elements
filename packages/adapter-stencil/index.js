export const metadata = {
  adapterId: 'stencil',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: null,
};

export async function probeSSR() {
  return { available: true };
}
