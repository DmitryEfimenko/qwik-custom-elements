/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from 'vitest';

const useOnDocumentMock = vi.fn();

vi.mock('@builder.io/qwik', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@builder.io/qwik')>();

  return {
    ...actual,
    useOnDocument: useOnDocumentMock,
    // Replace $() with a test double that emits a callable fake QRL — the real
    // $() requires the Qwik optimizer which is not available in this test context.
    $: (fn: () => Promise<void>) =>
      Object.assign(async () => await fn(), { resolve: async () => fn }),
  };
});

vi.mock('@qwik-custom-elements/adapter-lit/ssr-client', () => ({}));

const setupDoneMarker = '__qce_lit_ssr_client_setup_done__';

describe('createLitSSRClientSetup', () => {
  beforeEach(() => {
    useOnDocumentMock.mockReset();
    delete (globalThis as Record<string, unknown>)[setupDoneMarker];
    (globalThis as Record<string, unknown>).document = {
      readyState: 'loading',
    };
  });

  it('returns a hook function', async () => {
    const { createLitSSRClientSetup } = await import(
      './lit-ssr-client-setup.js'
    );

    const hook = createLitSSRClientSetup();

    expect(hook).toBeTypeOf('function');
  });

  it('registers readystatechange listener', async () => {
    const { createLitSSRClientSetup } = await import(
      './lit-ssr-client-setup.js'
    );

    const useLitSSRClientSetup = createLitSSRClientSetup();
    useLitSSRClientSetup();

    expect(useOnDocumentMock).toHaveBeenCalledOnce();
    expect(useOnDocumentMock).toHaveBeenCalledWith(
      'readystatechange',
      expect.any(Function),
    );
  });

  it('runs setup immediately when document is already loaded', async () => {
    const { createLitSSRClientSetup } = await import(
      './lit-ssr-client-setup.js'
    );

    const importLibrary = vi.fn(async () => {});
    const importLibraryQrl = {
      resolve: vi.fn(async () => importLibrary),
    } as unknown as import('@builder.io/qwik').QRL<() => Promise<void>>;

    const useLitSSRClientSetup = createLitSSRClientSetup(importLibraryQrl);

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });

    useLitSSRClientSetup();

    await new Promise((r) => setTimeout(r, 0));

    expect(importLibrary).toHaveBeenCalledTimes(1);
  });

  it('executes setup only once across repeated handler calls', async () => {
    const { createLitSSRClientSetup } = await import(
      './lit-ssr-client-setup.js'
    );

    const importLibrary = vi.fn(async () => {});
    const importLibraryQrl = {
      resolve: vi.fn(async () => importLibrary),
    } as unknown as import('@builder.io/qwik').QRL<() => Promise<void>>;

    const useLitSSRClientSetup = createLitSSRClientSetup(importLibraryQrl);
    useLitSSRClientSetup();

    const capturedQrl = useOnDocumentMock.mock.calls[0]?.[1] as {
      resolve: () => Promise<() => Promise<void>>;
    };
    const handler = await capturedQrl.resolve();

    await handler();
    await handler();

    expect(importLibrary).toHaveBeenCalledTimes(1);
  });
});
