---
'@qwik-custom-elements/core': patch
---

Fix package root resolution for packages with strict `exports` maps that do not expose
`./package.json`. The generator now falls back to resolving the package's main entry point and
walking up the directory tree to find the package root by matching the `name` field in
`package.json`. This fixes `QCE_PACKAGE_NAME_RESOLVE_FAILED` errors when using Stencil v4
libraries (and other packages) that omit `./package.json` from their `exports` map.
