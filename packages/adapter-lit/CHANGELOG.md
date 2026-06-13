# @qwik-custom-elements/adapter-lit

## 1.0.1

### Patch Changes

- 2ceda58: Add `@qwik-custom-elements/core` as an optional peer dependency of both adapter packages. Package managers will now warn when `core` is absent but the adapter is installed, helping users who intend to run `pnpm exec qwik-custom-elements generate` discover that they need to also install `@qwik-custom-elements/core`.
- Updated dependencies [32a398f]
- Updated dependencies [5aa4895]
  - @qwik-custom-elements/core@1.0.1
