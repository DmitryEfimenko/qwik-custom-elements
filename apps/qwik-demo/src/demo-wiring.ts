import { generatedComponentTags } from './generated';
import { DemoPrimaryWrapperTag, isKnownGeneratedTag } from './manual';

export interface DemoWiringSnapshot {
  primaryWrapperTag: string;
  tagCount: number;
  tags: readonly string[];
}

export function createDemoWiringSnapshot(): DemoWiringSnapshot {
  return {
    primaryWrapperTag: DemoPrimaryWrapperTag,
    tagCount: generatedComponentTags.length,
    tags: generatedComponentTags,
  };
}

export function isDemoPrimaryWrapperKnown(): boolean {
  return isKnownGeneratedTag(DemoPrimaryWrapperTag);
}
