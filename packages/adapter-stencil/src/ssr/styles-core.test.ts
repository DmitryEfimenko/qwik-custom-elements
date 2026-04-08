import { describe, expect, it } from 'vitest';

import {
  collectStencilSsrStyles,
  createStencilSsrStyleStore,
  getOrCreateStencilSsrStyleStore,
  toDocumentHeadStyles,
} from './styles-core';

describe('stencil SSR style store utilities', () => {
  it('creates and reuses request-scoped style store', () => {
    const requestEvent = { sharedMap: new Map<string, unknown>() };

    const first = getOrCreateStencilSsrStyleStore(requestEvent as any);
    const second = getOrCreateStencilSsrStyleStore(requestEvent as any);

    expect(first).toBe(second);
    expect(first.stylesByKey).toBeInstanceOf(Map);
  });

  it('collects styles using id, tag fallback, and inline fallback keys deterministically', () => {
    const styleStore = createStencilSsrStyleStore();

    collectStencilSsrStyles(
      {
        html: '<de-button></de-button>',
        styles: [
          { id: 'sc-de-button', content: '.de-button{color:red;}' },
          { content: '.de-card{color:blue;}' },
        ],
      },
      styleStore,
      'de-card',
    );

    collectStencilSsrStyles(
      {
        html: '<de-card></de-card>',
        styles: [{ content: '.anonymous{display:none;}' }],
      },
      styleStore,
    );

    const entries = [...styleStore.stylesByKey.entries()];
    expect(entries[0]).toEqual(['sc-de-button', '.de-button{color:red;}']);
    expect(entries[1]).toEqual(['sc-de-card', '.de-card{color:blue;}']);
    expect(entries[2]?.[0]).toMatch(
      /^inline-\d+-\.anonymous\{display:none;\}$/,
    );
    expect(entries[2]?.[1]).toBe('.anonymous{display:none;}');
  });

  it('converts style store into deterministic document head style records', () => {
    const styleStore = createStencilSsrStyleStore();
    styleStore.stylesByKey.set('sc-de-button', '.de-button{color:red;}');

    const headStyles = toDocumentHeadStyles(styleStore, {
      keyPrefix: 'adapter-stencil',
      nonce: 'nonce-123',
    });

    expect(headStyles).toEqual([
      {
        key: 'adapter-stencil-sc-de-button',
        style: '.de-button{color:red;}',
        props: { nonce: 'nonce-123' },
      },
    ]);
  });
});
