import { describe, expect, it, vi } from 'vitest';

import { updateStencilElementProps } from './element-props-utils';

describe('updateStencilElementProps', () => {
  it('writes serializable primitive values as attributes and skips event-like keys', () => {
    const setAttribute = vi.fn();
    const element = { setAttribute } as unknown as Element;

    updateStencilElementProps(element, {
      label: 'button',
      count: 3,
      active: true,
      nullable: null,
      onClick$: () => undefined,
      onInput: () => undefined,
      $signal: 'ignored',
    });

    expect(setAttribute).toHaveBeenCalledTimes(4);
    expect(setAttribute).toHaveBeenCalledWith('label', 'button');
    expect(setAttribute).toHaveBeenCalledWith('count', '3');
    expect(setAttribute).toHaveBeenCalledWith('active', 'true');
    expect(setAttribute).toHaveBeenCalledWith('nullable', 'null');
  });

  it('writes non-primitive values as element properties', () => {
    const setAttribute = vi.fn();
    const element = { setAttribute } as unknown as Element & {
      config?: Record<string, unknown>;
    };
    const config = { mode: 'advanced' };

    updateStencilElementProps(element, { config });

    expect(setAttribute).not.toHaveBeenCalled();
    expect((element as any).config).toBe(config);
  });

  it('is a no-op when element or props are missing', () => {
    const setAttribute = vi.fn();
    const element = { setAttribute } as unknown as Element;

    updateStencilElementProps(undefined, { label: 'x' });
    updateStencilElementProps(element, undefined);

    expect(setAttribute).not.toHaveBeenCalled();
  });
});
