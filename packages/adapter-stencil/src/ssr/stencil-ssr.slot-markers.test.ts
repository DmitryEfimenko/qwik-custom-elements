import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SLOT_MARKER,
  buildInputHtml,
  buildInputHtmlWithOptions,
  namedSlotMarker,
  stripSlotMarkersFromHtml,
} from './stencil-ssr';

describe('slot marker cleanup', () => {
  it('removes default and named slot markers from emitted HTML', () => {
    const html = [
      '<ps-tabs>',
      DEFAULT_SLOT_MARKER,
      '<div slot="tab">',
      namedSlotMarker('tab'),
      '</div>',
      '</ps-tabs>',
    ].join('');

    expect(stripSlotMarkersFromHtml(html, ['tab'])).toBe(
      '<ps-tabs><div slot="tab"></div></ps-tabs>',
    );
  });

  it('keeps non-marker comments intact', () => {
    const html = '<div><!--keep-me-->' + DEFAULT_SLOT_MARKER + '</div>';

    expect(stripSlotMarkersFromHtml(html, [])).toBe(
      '<div><!--keep-me--></div>',
    );
  });

  it('uses span as named-slot placeholder wrapper by default', () => {
    const html = buildInputHtml('ps-tabs', ['tab']);

    expect(html).toContain(
      '<span slot="tab" style="display:contents"><!--SLOT:tab--></span>',
    );
  });

  it('keeps a legacy div-wrapper fallback for compatibility rollbacks', () => {
    const html = buildInputHtmlWithOptions('ps-tabs', ['tab'], {
      useLegacyNamedSlotWrapper: true,
    });

    expect(html).toContain(
      '<div slot="tab" style="display:contents"><!--SLOT:tab--></div>',
    );
  });
});
