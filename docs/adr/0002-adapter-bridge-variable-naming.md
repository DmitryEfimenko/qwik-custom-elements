# Adapter Bridge Variable Naming

When `libraryName` is provided, generated bridge component names follow `{PascalCase(libraryName)}{mode}BridgeComponent`; without it adapters fall back to generic names. The naming logic is adapter-owned and implemented independently in each adapter package — core does not participate in or validate bridge variable names.
