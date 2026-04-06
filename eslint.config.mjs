import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ignores = [
  '**/*.log',
  '**/.DS_Store',
  '**/.history',
  '**/.yarn',
  '**/bazel-*',
  '**/bazel-bin',
  '**/bazel-out',
  '**/bazel-qwik',
  '**/bazel-testlogs',
  '**/dist',
  '**/dist-dev',
  '**/build',
  '**/coverage',
  '**/lib',
  '**/lib-types',
  '**/etc',
  '**/external',
  '**/node_modules',
  '**/temp',
  '**/tmp',
  '**/output',
  '**/target',
  '**/tsc-out',
  '**/tsdoc-metadata.json',
  '**/.cache',
  '**/.rollup.cache',
  '**/.netlify',
  '**/.vscode',
  '**/tsconfig.tsbuildinfo',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/src/generated/**',
  'apps/qwik-demo/server/**',
  '.turbo/**',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
];

export default tseslint.config(
  globalIgnores(ignores),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['packages/test-stencil-lib/src/components/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^h$',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
