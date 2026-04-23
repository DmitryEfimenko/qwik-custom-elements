import { describe, expect, it } from 'vitest';

import { updateStencilCSRHostProps } from './stencil-csr-props';

describe('updateStencilCSRHostProps', () => {
  it('applies non-event props to existing host element instance', () => {
    const host = {} as HTMLElement;
    const hostRecord = host as unknown as Record<string, unknown>;

    updateStencilCSRHostProps(host, {
      size: 'lg',
      disabled: true,
      count: 3,
      data: { mode: 'compact' },
    });

    expect(hostRecord.size).toBe('lg');
    expect(hostRecord.disabled).toBe(true);
    expect(hostRecord.count).toBe(3);
    expect(hostRecord.data).toEqual({ mode: 'compact' });
  });

  it('ignores event-like props when applying host props', () => {
    const host = {} as HTMLElement;
    const hostRecord = host as unknown as Record<string, unknown>;
    const onClick = () => {
      return;
    };

    updateStencilCSRHostProps(host, {
      onClick,
      $qrl: onClick,
      size: 'md',
    });

    expect(hostRecord.onClick).toBeUndefined();
    expect(hostRecord.$qrl).toBeUndefined();
    expect(hostRecord.size).toBe('md');
  });
});
