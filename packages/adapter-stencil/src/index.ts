export const metadata = {
  adapterId: 'stencil',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: null,
};

export async function probeSSR(): Promise<{ available: boolean }> {
  return { available: true };
}
