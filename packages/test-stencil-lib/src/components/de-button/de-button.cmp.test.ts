import { describe, expect, it, vi } from 'vitest';

describe('de-button', () => {
  it('emits tripleClick only on the third click with the original MouseEvent', async () => {
    document.body.innerHTML = '<de-button>Click me</de-button>';

    const host = document.querySelector('de-button') as HTMLElement | null;
    expect(host).not.toBeNull();

    await customElements.whenDefined('de-button');
    await (host as any).componentOnReady?.();

    const onTripleClick = vi.fn();
    host!.addEventListener('tripleClick', onTripleClick as EventListener);

    const button = host!.querySelector('button');
    expect(button).not.toBeNull();

    button!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );

    button!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onTripleClick).toHaveBeenCalledTimes(0);

    button!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onTripleClick).toHaveBeenCalledTimes(1);
    const emittedEvent = onTripleClick.mock.calls[0][0] as CustomEvent<MouseEvent>;
    expect(emittedEvent.detail).toBeInstanceOf(MouseEvent);
    expect(emittedEvent.detail.type).toBe('click');
  });
});
