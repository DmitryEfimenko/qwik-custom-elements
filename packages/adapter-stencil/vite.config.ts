import { qwikVite } from '@builder.io/qwik/optimizer';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: './src/index.ts',
        'client/index': './src/client/index.ts',
        'ssr/index': './src/ssr/index.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName === 'index') {
          return format === 'es' ? 'index.qwik.mjs' : 'index.qwik.cjs';
        }

        return `${entryName}.${format === 'es' ? 'js' : 'cjs'}`;
      },
    },
  },
  plugins: [qwikVite({ csr: true })],
});
