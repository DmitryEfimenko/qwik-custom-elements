export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

export async function probeSSR(): Promise<{ available: boolean }> {
  return { available: true };
}

export function renderLitSsrComponent(
  options: { tagName?: unknown } = {},
): string {
  const tagName =
    typeof options.tagName === 'string' && options.tagName.trim().length > 0
      ? options.tagName.trim()
      : 'lit-button';

  return `<${tagName}></${tagName}>`;
}
