# Lit SSR Runtime Bridge No-Arg Contract

Generated Lit SSR runtime modules call `createLitSSRComponent()` with no arguments. There is no renderer-injection parameter; the SSR renderer is adapter-internal and not part of the generated surface contract, so generated files cannot be broken by renderer implementation changes.
