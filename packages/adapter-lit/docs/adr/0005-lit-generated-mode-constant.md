# Lit Generated Mode Constant

Generated `index.ts` exports `generatedMode = 'ssr' as const` when SSR is available and `'csr' as const` otherwise. This constant is adapter-lit–owned (not core-owned) and provides a machine-verifiable in-file mode signal that can be consumed at import or bundling time without inspecting filenames or config.
