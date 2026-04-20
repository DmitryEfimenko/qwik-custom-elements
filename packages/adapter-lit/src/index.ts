import { createLitPlannedWrites } from './generated-output.js';

export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

export async function probeSSR(): Promise<{ available: boolean }> {
  return { available: false };
}

export function createGeneratedOutput(input: {
  projectId?: string;
  componentDefinitions?: Array<{ tagName: string }>;
  ssrAvailable?: boolean;
}): Array<{
  relativePath: string;
  content: string;
}> {
  return createLitPlannedWrites(input);
}
