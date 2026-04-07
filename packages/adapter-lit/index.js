export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

export async function probeSSR() {
  return { available: false };
}
