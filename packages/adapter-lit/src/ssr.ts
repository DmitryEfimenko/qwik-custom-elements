import { createLitPlannedWrites } from './generated-output.js';

export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

export async function probeSSR(): Promise<{ available: boolean }> {
  // Placeholder probe for tracer-bullet wiring.
  // TODO(#13): replace with real Lit SSR capability checks.
  return { available: true };
}

export function renderComponentSsrHtml(
  options: { tagName?: unknown } = {},
): string | null {
  // Placeholder output for tracer-bullet contract wiring only.
  // TODO(#13): replace tag-only output with true adapter-owned Lit SSR output.
  if (
    typeof options.tagName !== 'string' ||
    options.tagName.trim().length === 0
  ) {
    return null;
  }

  const tagName = options.tagName.trim();

  return `<${tagName}></${tagName}>`;
}

export function createGeneratedOutput(input: {
  projectId?: string;
  componentDefinitions?: Array<{ tagName: string }>;
  ssrAvailable?: boolean;
}): Array<{
  relativePath: string;
  content: string;
}> {
  return createLitPlannedWrites({
    ...input,
    renderComponentSsrHtml,
  });
}

export const createAdditionalPlannedWrites = createGeneratedOutput;
