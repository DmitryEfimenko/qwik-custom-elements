export function renderComponentCsrTag(
  options: { tagName?: unknown } = {},
): string | null {
  if (options.tagName == null) {
    return null;
  }

  if (
    typeof options.tagName !== 'string' ||
    options.tagName.trim().length === 0
  ) {
    throw createContractError(
      'QCE_LIT_RUNTIME_TAGNAME_INVALID',
      'Lit CSR render contract requires options.tagName to be a non-empty string when provided.',
    );
  }

  return options.tagName.trim();
}

export type LitCsrComponentRenderer = (options?: {
  tagName?: unknown;
}) => string | null;

export type LitGeneratedCsrComponent = (options: {
  tagName: string;
}) => string | null;

export function createLitCSRComponent(
  render: LitCsrComponentRenderer,
): LitGeneratedCsrComponent {
  return ({ tagName }) => {
    return render({ tagName });
  };
}

function createContractError(
  code: string,
  message: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}
