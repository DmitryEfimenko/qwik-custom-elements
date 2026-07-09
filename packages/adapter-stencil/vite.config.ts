import { qwikVite } from '@builder.io/qwik/optimizer';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const externalDependencies = [
  '@builder.io/qwik',
  '@builder.io/qwik/jsx-runtime',
  '@builder.io/qwik-city',
  '@qwik-custom-elements/core',
  'node:fs',
  'node:path',
];

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    // Keep Qwik-oriented symbols stable in emitted library code.
    // Minification can rename locals to `$`, which the consumer optimizer
    // interprets as a QRL marker and rejects.
    minify: false,
    lib: {
      entry: {
        index: './src/index.ts',
        'client/index': './src/client/index.ts',
        'ssr/index': './src/ssr/index.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.qwik.mjs`,
    },
    rollupOptions: {
      external: (id) => {
        if (id === '@builder.io/qwik/qwikloader.js') {
          return false;
        }

        return externalDependencies.some(
          (dependency) => id === dependency || id.startsWith(`${dependency}/`),
        );
      },
    },
  },
  plugins: [
    qwikVite({ csr: true, entryStrategy: { type: 'inline' } }),
    dts({
      entryRoot: 'src',
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
});
