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
  libraryName?: string;
  componentDefinitions?: Array<{
    tagName: string;
    props: Array<{ name: string; type: string; required: boolean }>;
    events: Array<{ name: string; type: string }>;
    slots: Array<{ name: string }>;
  }>;
  ssrAvailable?: boolean;
}): Array<{
  relativePath: string;
  content: string;
}> {
  return createLitPlannedWrites(input);
}
