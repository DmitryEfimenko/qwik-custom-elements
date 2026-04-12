import { beforeEach, describe, expect, it, vi } from 'vitest';

const useOnDocumentMock = vi.fn();

vi.mock('@builder.io/qwik', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@builder.io/qwik')>();

  return {
    ...actual,
    useOnDocument: useOnDocumentMock,
  };
});

const setupDoneMarker = '__qce_stencil_client_setup_done__';

function createDocumentStub() {
  const head = {
    appendChild: vi.fn(),
  };

  const querySelectorAll = vi
    .fn<() => NodeListOf<HTMLStyleElement>>()
    .mockReturnValue([] as unknown as NodeListOf<HTMLStyleElement>);

  return {
    head,
    querySelectorAll,
    readyState: 'loading',
  };
}

describe('createStencilClientSetup', () => {
  beforeEach(() => {
    useOnDocumentMock.mockReset();
    delete (globalThis as Record<string, unknown>)[setupDoneMarker];
    (globalThis as Record<string, unknown>).document =
      createDocumentStub() as unknown as Document;
  });

  it('runs setup immediately when document is already loaded', async () => {
    const { createStencilClientSetup } = await import('./client-setup');

    const defineCustomElements = vi.fn(async () => {});
    const useStencilClientSetup =
      createStencilClientSetup(defineCustomElements);

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });

    useStencilClientSetup();

    await Promise.resolve();
    await Promise.resolve();

    expect(defineCustomElements).toHaveBeenCalledTimes(1);
  });

  it('registers load listener and executes setup once across repeated callbacks', async () => {
    const { createStencilClientSetup } = await import('./client-setup');

    const defineCustomElements = vi.fn(async () => {});
    const useStencilClientSetup =
      createStencilClientSetup(defineCustomElements);

    useStencilClientSetup();

    expect(useOnDocumentMock).toHaveBeenCalledTimes(1);
    expect(useOnDocumentMock).toHaveBeenNthCalledWith(
      1,
      'load',
      expect.any(Function),
    );

    const loadQrl = useOnDocumentMock.mock.calls[0]?.[1] as
      | { resolve: () => Promise<() => Promise<void>> }
      | undefined;
    const loadHandler = await loadQrl?.resolve();

    expect(loadQrl?.resolve).toBeTypeOf('function');

    await loadHandler?.();
    await loadHandler?.();

    expect(defineCustomElements).toHaveBeenCalledTimes(1);
  });

  it('supports QRL-style setup input with resolve()', async () => {
    const { createStencilClientSetup } = await import('./client-setup');

    const defineCustomElements = vi.fn(async () => {});
    const defineCustomElementsQrl = {
      resolve: vi.fn(async () => defineCustomElements),
    };

    const useStencilClientSetup = createStencilClientSetup(
      defineCustomElementsQrl as any,
    );

    useStencilClientSetup();

    const loadQrl = useOnDocumentMock.mock.calls[0]?.[1] as
      | { resolve: () => Promise<() => Promise<void>> }
      | undefined;
    const loadHandler = await loadQrl?.resolve();

    await loadHandler?.();
    await loadHandler?.();

    expect(defineCustomElementsQrl.resolve).toHaveBeenCalledTimes(1);
    expect(defineCustomElements).toHaveBeenCalledTimes(1);
  });

  it('supports setup without defineCustomElements', async () => {
    const { createStencilClientSetup } = await import('./client-setup');

    const useStencilClientSetup = createStencilClientSetup();

    useStencilClientSetup();

    const loadQrl = useOnDocumentMock.mock.calls[0]?.[1] as
      | { resolve: () => Promise<() => Promise<void>> }
      | undefined;
    const loadHandler = await loadQrl?.resolve();

    await expect(loadHandler?.()).resolves.toBeUndefined();
  });
});
