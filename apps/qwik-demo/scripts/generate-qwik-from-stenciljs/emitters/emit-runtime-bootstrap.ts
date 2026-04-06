import { relative, resolve } from 'node:path';
import type { GenerateContext } from '../types';

function toPosixPath(path: string): string {
  return path.replace(/\\/g, '/');
}

function ensureRelativeImport(fromDir: string, target: string): string {
  const relativePath = toPosixPath(relative(fromDir, target));
  const withoutExtension = relativePath.replace(/\.(tsx?|jsx?)$/, '');

  if (withoutExtension.startsWith('.')) {
    return withoutExtension;
  }

  return `./${withoutExtension}`;
}

function getHelperImports(outDirAbs: string): {
  stencilSsrImport: string;
  clientSetupImport: string;
  modelImport: string;
} {
  const appRoot = process.cwd();

  const stencilSsrImport = ensureRelativeImport(
    outDirAbs,
    resolve(appRoot, 'src/components/stencil-js-qwik-ssr/stencil-ssr.tsx'),
  );
  const clientSetupImport = ensureRelativeImport(
    outDirAbs,
    resolve(appRoot, 'src/components/stencil-js-qwik-ssr/client-setup.ts'),
  );
  const modelImport = ensureRelativeImport(
    outDirAbs,
    resolve(appRoot, 'src/components/stencil-js-qwik-ssr/model.ts'),
  );

  return {
    stencilSsrImport,
    clientSetupImport,
    modelImport,
  };
}

function getRuntimeImports(context: GenerateContext): {
  defineCustomElementsImport: string;
  renderToStringImport: string;
} {
  const { config } = context;

  if (config.importMode === 'demo') {
    const appRoot = process.cwd();
    const outDirAbs = resolve(appRoot, config.outDir);
    const defaultDemoImport = ensureRelativeImport(
      outDirAbs,
      resolve(appRoot, 'src/components/stencil-js-utils.ts'),
    );

    return {
      defineCustomElementsImport:
        config.runtimeImports?.demoDefineCustomElements ?? defaultDemoImport,
      renderToStringImport:
        config.runtimeImports?.demoRenderToString ?? defaultDemoImport,
    };
  }

  const packageLoaderImport =
    config.runtimeImports?.packageLoader ??
    (config.packageName ? `${config.packageName}/loader` : undefined);
  const packageHydrateImport =
    config.runtimeImports?.packageHydrate ??
    (config.packageName ? `${config.packageName}/hydrate` : undefined);

  if (!packageLoaderImport || !packageHydrateImport) {
    throw new Error(
      'Package mode requires packageName or runtimeImports.packageLoader and runtimeImports.packageHydrate.',
    );
  }

  return {
    defineCustomElementsImport: packageLoaderImport,
    renderToStringImport: packageHydrateImport,
  };
}

function emitDemoModeRuntime(
  context: GenerateContext,
  outDirAbs: string,
): string {
  const imports = getHelperImports(outDirAbs);
  const runtimeImports = getRuntimeImports(context);

  const singleRuntimeModule =
    runtimeImports.defineCustomElementsImport ===
    runtimeImports.renderToStringImport;

  const runtimeImportBlock = singleRuntimeModule
    ? `import {
  defineCustomElements as runtimeDefineCustomElements,
  renderToString as runtimeRenderToString,
} from '${runtimeImports.defineCustomElementsImport}';`
    : `import { defineCustomElements as runtimeDefineCustomElements } from '${runtimeImports.defineCustomElementsImport}';
import { renderToString as runtimeRenderToString } from '${runtimeImports.renderToStringImport}';`;

  return `import { $ } from '@builder.io/qwik';
import { createStencilSSRComponent } from '${imports.stencilSsrImport}';
import { createStencilClientSetup } from '${imports.clientSetupImport}';
import type { StencilRenderToStringOptions } from '${imports.modelImport}';
${runtimeImportBlock}

export const defineCustomElements = async (): Promise<void> => {
  await Promise.resolve(runtimeDefineCustomElements());
};

export const renderToString = async (
  input: string,
  options?: StencilRenderToStringOptions,
) => {
  return Promise.resolve(runtimeRenderToString(input, options));
};

export const defineCustomElementsQrl = $(defineCustomElements);
export const stencilRenderToStringQrl = $(renderToString);
export const useGeneratedStencilClientSetup =
  createStencilClientSetup(defineCustomElementsQrl);
export const GeneratedStencilComponent =
  createStencilSSRComponent(stencilRenderToStringQrl);
`;
}

function emitPackageModeRuntime(
  context: GenerateContext,
  outDirAbs: string,
): string {
  const imports = getHelperImports(outDirAbs);
  const runtimeImports = getRuntimeImports(context);

  return `import { $ } from '@builder.io/qwik';
import { createStencilSSRComponent } from '${imports.stencilSsrImport}';
import { createStencilClientSetup } from '${imports.clientSetupImport}';
import type { StencilRenderToStringOptions } from '${imports.modelImport}';
import { defineCustomElements as runtimeDefineCustomElements } from '${runtimeImports.defineCustomElementsImport}';
import { renderToString as runtimeRenderToString } from '${runtimeImports.renderToStringImport}';

export const defineCustomElements = async (): Promise<void> => {
  await Promise.resolve(runtimeDefineCustomElements());
};

export const renderToString = async (
  input: string,
  options?: StencilRenderToStringOptions,
) => {
  const result = await Promise.resolve(runtimeRenderToString(input, options));
  return {
    html: (result as { html?: string } | undefined)?.html ?? input,
    styles: (result as { styles?: unknown[] } | undefined)?.styles,
    components: (result as { components?: unknown[] } | undefined)?.components,
  };
};

export const defineCustomElementsQrl = $(defineCustomElements);
export const stencilRenderToStringQrl = $(renderToString);
export const useGeneratedStencilClientSetup =
  createStencilClientSetup(defineCustomElementsQrl);
export const GeneratedStencilComponent =
  createStencilSSRComponent(stencilRenderToStringQrl);
`;
}

export function emitRuntimeBootstrap(context: GenerateContext): string {
  const outDirAbs = resolve(process.cwd(), context.config.outDir);

  if (context.config.importMode === 'demo') {
    return emitDemoModeRuntime(context, outDirAbs);
  }

  return emitPackageModeRuntime(context, outDirAbs);
}
