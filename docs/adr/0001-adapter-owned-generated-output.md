# Adapter-Owned Generated Output

Core owns orchestration; adapters own the full generated file set. Core passes typed ComponentMetadata into `createGeneratedOutput` and must not branch on adapter identity to decide file content, filenames, or fallback generation. The boundary exists so adapters can evolve their output shape independently without requiring core changes.
