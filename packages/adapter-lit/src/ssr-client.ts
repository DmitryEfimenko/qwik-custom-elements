/**
 * Client-side Lit SSR hydration support.
 *
 * Import this module (or ensure it is evaluated) **before** any Lit custom
 * elements are defined via `customElements.define()`. It patches `LitElement`
 * so that elements whose shadow root was already created from a Declarative
 * Shadow DOM (DSD) template — produced by `@lit-labs/ssr` on the server — are
 * hydrated in place rather than being re-rendered from scratch.
 *
 * Without this patch, Lit's first `performUpdate()` call appends a fresh render
 * tree alongside the existing DSD content, producing a duplicate shadow DOM
 * (e.g., two `.de-alert` divs visible to the user).
 */
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
