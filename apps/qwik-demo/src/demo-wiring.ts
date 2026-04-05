import { QwikAppRoot, generatedComponentTags } from './generated';

export interface DemoWiringSnapshot {
  primaryWrapperTag: string;
  tagCount: number;
  tags: readonly string[];
}

export function createDemoWiringSnapshot(): DemoWiringSnapshot {
  return {
    primaryWrapperTag: QwikAppRoot,
    tagCount: generatedComponentTags.length,
    tags: generatedComponentTags,
  };
}
