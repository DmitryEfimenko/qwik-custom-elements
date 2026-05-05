import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { createLitPlannedWrites } from './generated-output.js';
import { createLitSSRComponent } from './ssr/lit-ssr.js';

export const metadata = {
  adapterId: 'lit',
  supportedSourceTypes: ['CEM', 'PACKAGE_NAME'],
  supportsSsrProbe: true,
  ssrRuntimeSubpath: './ssr',
};

export type { LitSSRProps } from './ssr/lit-ssr.js';

export async function probeSSR(): Promise<{ available: boolean }> {
  // Placeholder probe for tracer-bullet wiring.
  // TODO(#13): replace with real Lit SSR capability checks.
  return { available: true };
}

export function renderComponentSsrHtml(
  options: { tagName?: unknown; props?: Record<string, unknown> } = {},
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

  const serializedProps = serializePropsForHtml(options.props ?? {});
  const openingTag = serializedProps.length
    ? `<${tagName} ${serializedProps}>`
    : `<${tagName}>`;

  return `${openingTag}</${tagName}>`;
}

export type LitGeneratedSsrComponent = ReturnType<typeof createLitSSRComponent>;

export { createLitSSRComponent };

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
  libraryName?: string;
  componentDefinitions?: Array<{
    tagName: string;
    props: Array<{ name: string; type: string; required: boolean }>;
    events: Array<{ name: string; type: string }>;
    slots: Array<{ name: string }>;
  }>;
  runtimeImports?: {
    libraryImport?: string;
  };
  ssrAvailable?: boolean;
}): Array<{
  relativePath: string;
  content: string;
}> {
  return createLitPlannedWrites(input);
}

function serializePropsForHtml(props: Record<string, unknown>): string {
  return Object.entries(props)
    .filter(
      ([key, value]) => key.trim().length > 0 && isSerializableValue(value),
    )
    .map(([key, value]) => {
      if (value === true) {
        return key;
      }

      return `${key}=${JSON.stringify(String(value))}`;
    })
    .join(' ');
}

function isSerializableValue(
  value: unknown,
): value is string | number | boolean {
  if (value == null) {
    return false;
  }

  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}
