# qwik-demo

## Generated Wrappers and Manual Extension Boundary

This demo keeps generated wrappers in `src/generated` and manual customization in `src/manual`.

- Regenerate wrappers by running `node packages/core/dist/cli.js` from the repository root.
- Treat `src/generated` as write-only generated output.
- Add app-specific aliases/helpers in `src/manual` without editing generated files.

Current example:

- `src/manual/custom-wrappers.ts` re-exports generated wrapper values and adds a helper function.
- `src/demo-wiring.ts` consumes the manual layer (`src/manual`) rather than customizing generated files directly.
