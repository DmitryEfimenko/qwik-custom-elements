# Compatibility Matrix

This document lists tested package combinations for `@qwik-custom-elements/core` and its adapters.

## Policy

Update this document when releasing a version that changes the minimum or maximum supported version of any peer dependency or Node.js runtime.

For breaking changes in the 0.x series, update the table(s) below before merging the PR that introduces the breaking change.

## Tested Combinations

### Core

| core  | @builder.io/qwik | Node.js | TypeScript |
| ----- | ---------------- | ------- | ---------- |
| 1.0.0 | 1.19.2           | 20.x    | 5.9.3      |

### adapter-lit

| adapter-lit | @builder.io/qwik | lit   | @lit-labs/ssr | @lit-labs/ssr-client | Node.js | TypeScript |
| ----------- | ---------------- | ----- | ------------- | -------------------- | ------- | ---------- |
| 1.0.0       | 1.19.2           | 3.3.2 | 4.x           | 1.1.x                | 20.x    | 5.9.3      |

### adapter-stencil

| adapter-stencil | @builder.io/qwik | @builder.io/qwik-city | @stencil/core | Node.js | TypeScript |
| --------------- | ---------------- | --------------------- | ------------- | ------- | ---------- |
| 1.0.0           | 1.19.2           | 1.19.2                | 4.43.3        | 20.x    | 5.9.3      |
