import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: [
      // Build outputs
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      // Test artifacts
      'tests/reports/**',
      'tests/results/**',
      'tests/e2e/.auth/**',
      'coverage/**',
      // Generated files
      '**/*.min.js',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler rules introduced in eslint-plugin-react-hooks 7 flag
      // existing patterns; warn until those components are refactored
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
