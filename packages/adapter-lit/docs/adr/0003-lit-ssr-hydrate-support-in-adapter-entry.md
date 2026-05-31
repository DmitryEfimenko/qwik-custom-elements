# Lit SSR Hydrate Support in Adapter Entry

`@lit-labs/ssr-client/lit-element-hydrate-support.js` is loaded at module entry of `@qwik-custom-elements/adapter-lit/ssr`. This ensures the Lit client upgrade hydrates existing DSD output instead of duplicating shadow DOM, and keeps the requirement adapter-local rather than requiring each consumer route to import it manually.
