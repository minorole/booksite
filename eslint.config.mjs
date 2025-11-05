import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import localA11y from './tools/eslint-rules/dialog-a11y.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

const config = [
  ...compat.config({
    ignorePatterns: ['src/types/supabase.generated.ts', '.next/**', 'node_modules/**', 'public/**', 'scripts/**', 'doc/**'],
    extends: [
      // Temporarily omit Next's legacy config to avoid circular validation issues on v16.
      // Reintroduce with flat-compatible preset when available.
      'eslint:recommended',
      'plugin:promise/recommended',
      'prettier',
    ],
    plugins: ['promise'],
    rules: {
      'no-warning-comments': ['error', { terms: ['todo', 'fixme'], location: 'anywhere' }],
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'off',
    },
    overrides: [
      {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        excludedFiles: ['src/types/supabase.generated.ts'],
        extends: ['plugin:@typescript-eslint/recommended-type-checked'],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          project: './tsconfig.json',
          tsconfigRootDir: __dirname,
        },
        rules: {
          '@typescript-eslint/no-floating-promises': 'off',
          '@typescript-eslint/no-misused-promises': 'off',
          '@typescript-eslint/consistent-type-imports': 'off',
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
          '@typescript-eslint/no-unused-vars': 'off',
          '@typescript-eslint/no-unsafe-assignment': 'off',
          '@typescript-eslint/no-unsafe-argument': 'off',
          '@typescript-eslint/no-unsafe-member-access': 'off',
          '@typescript-eslint/no-unsafe-call': 'off',
          '@typescript-eslint/no-unsafe-return': 'off',
          '@typescript-eslint/no-require-imports': 'off',
          '@typescript-eslint/no-unnecessary-type-assertion': 'off',
          '@typescript-eslint/no-redundant-type-constituents': 'off',
          '@typescript-eslint/restrict-template-expressions': 'off',
          '@typescript-eslint/no-base-to-string': 'off',
        },
      },
      {
        files: ['test/**/*.{js,jsx,ts,tsx}'],
        rules: {
          'promise/param-names': 'off',
          'no-unused-vars': 'off',
        },
      },
    ],
  }),
  // Local custom rules
  {
    files: ['src/**/*.tsx'],
    plugins: {
      'local-a11y': localA11y,
    },
    rules: {
      'local-a11y/dialog-needs-title-and-description': 'error',
    },
  },
]

export default config
