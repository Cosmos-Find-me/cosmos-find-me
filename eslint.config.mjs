import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // -------------------------------------------------------------------------
  // Global ignores
  // -------------------------------------------------------------------------
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      'tests/reports/**',
      'tests/results/**',
      'tests/e2e/.auth/**',
      'coverage/**',
      '**/*.min.js',
    ],
  },

  // -------------------------------------------------------------------------
  // Next.js base config (handles React, JSX, imports)
  // -------------------------------------------------------------------------
  ...compat.extends('next/core-web-vitals'),

  // -------------------------------------------------------------------------
  // Base rules (non-typed)
  // -------------------------------------------------------------------------
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // -------------------------------------------------------------------------
  // Type-aware rules for production source — src/ and app/
  // These require parserOptions.project and enforce zero-any policy.
  // -------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Ban all explicit `any` — use `unknown` + narrowing instead
      '@typescript-eslint/no-explicit-any': 'error',

      // Ban assignment of values typed as `any`
      '@typescript-eslint/no-unsafe-assignment': 'error',

      // Ban property access on `any`-typed values
      '@typescript-eslint/no-unsafe-member-access': 'error',

      // Ban passing `any`-typed values as function arguments
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Ban returning `any` from typed functions
      '@typescript-eslint/no-unsafe-return': 'error',

      // Ban calling an `any`-typed value as a function
      '@typescript-eslint/no-unsafe-call': 'error',

      // Require type assertions to go through `unknown` first when needed
      // e.g. (value as unknown as SpecificType) — prevents blind casting
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Relaxed rules for test infrastructure and eval scripts
  // These interact with untyped third-party APIs (Playwright, etc.)
  // -------------------------------------------------------------------------
  {
    files: [
      'tests/**/*.{ts,tsx}',
      'evals/**/*.{ts,tsx}',
      'scripts/**/*.{ts,tsx}',
      'src/utils/performanceTestSetup.ts',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
];

export default eslintConfig;
