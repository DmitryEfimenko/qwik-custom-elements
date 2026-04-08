import { QRL } from '@builder.io/qwik';

export interface StencilRenderToStringOptions {
  prettyHtml?: boolean;
  removeScripts?: boolean;
  fullDocument?: boolean;
  removeUnusedStyles?: boolean;
  serializeShadowRoot?:
    | 'declarative-shadow-dom'
    | 'scoped'
    | {
        'declarative-shadow-dom'?: string[];
        scoped?: string[];
        default: 'declarative-shadow-dom' | 'scoped';
      }
    | boolean;
  beforeHydrate?: (root: ParentNode) => void;
  [key: string]: unknown;
}

export interface StencilHydrateStyleElement {
  id?: string;
  href?: string;
  content?: string;
  [key: string]: string | undefined;
}

export interface StencilHydrateComponent {
  tag: string;
  mode: string;
  count: number;
  depth: number;
}

export interface StencilRenderToStringResult {
  html: string;
  styles?: StencilHydrateStyleElement[];
  components?: StencilHydrateComponent[];
}

export type StencilRenderToString = (
  input: string,
  options?: StencilRenderToStringOptions,
) => Promise<StencilRenderToStringResult>;

export interface StencilSSRProps {
  tagName: string;
  props?: Record<string, unknown>;
  /**
   * Optional custom-event names exposed by the Stencil component.
   * Used by the runtime bridge to attach listeners even when handlers
   * do not follow onX$ naming or use directive-based syntax.
   */
  events?: Record<string, QRL<(...args: any[]) => void>>;
  /**
   * Names of the named slots this Stencil component accepts (e.g. `['footer']`).
   * Children with the matching `q:slot` attribute will be projected into them.
   */
  slots?: string[];
  [key: string]: unknown;
}
