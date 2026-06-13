---
"@qwik-custom-elements/core": patch
"@qwik-custom-elements/adapter-lit": patch
"@qwik-custom-elements/adapter-stencil": patch
---

Add npm metadata fields to fix provenance validation and improve package discoverability.

This change adds standard npm package.json fields including:
- `repository` (required for npm provenance validation via sigstore)
- `description`, `keywords` (improve npm search discoverability)
- `author`, `license`, `homepage`, `bugs` (legal clarity and user support)
- `engines`, `funding`, `sideEffects` (tooling integration and optimization)

Fixes E422 error during npm publish: "Error verifying sigstore provenance bundle: Failed to validate repository information"
