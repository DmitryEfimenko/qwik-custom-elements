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
  // Keep fallback and hard-failure deterministic for contract tests.
  if (options.tagName == null) {
    return null;
  }

  if (
    typeof options.tagName !== 'string' ||
    options.tagName.trim().length === 0
  ) {
    throw createContractError(
      'QCE_LIT_RUNTIME_TAGNAME_INVALID',
      'Lit SSR render contract requires options.tagName to be a non-empty string when provided.',
    );
  }

  const tagName = options.tagName.trim();

  return `<${tagName}></${tagName}>`;
}

function createContractError(
  code: string,
  message: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
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
