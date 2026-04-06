export async function probeSSR() {
  return { available: true };
}

export function renderLitSsrComponent(options = {}) {
  const tagName =
    typeof options.tagName === 'string' && options.tagName.trim().length > 0
      ? options.tagName.trim()
      : 'lit-button';

  return `<${tagName}></${tagName}>`;
}
