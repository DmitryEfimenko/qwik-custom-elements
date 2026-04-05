import { QwikAppRoot, generatedComponentTags } from '../generated';

// Manual extension layer: safe place for custom naming and helper behavior.
export const DemoPrimaryWrapperTag = QwikAppRoot;

export function isKnownGeneratedTag(tag: string): boolean {
  return generatedComponentTags.includes(
    tag as (typeof generatedComponentTags)[number],
  );
}
