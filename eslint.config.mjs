import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/build/**',
      '**/*.cjs',
      'apps/mobile/.detoxrc.js',
      'apps/mobile/e2e/jest.config.js',
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // Prettier config to disable conflicting rules
  prettier,

  // Custom rules
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Allow require() in CommonJS config files
  {
    files: ['**/jest.config.js', '**/jest.setup.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Node globals for tooling and test helpers
  {
    files: [
      '**/__mocks__/**/*.js',
      '**/jest.env.js',
      '**/jest.setup.js',
      '**/babel.config.js',
      '**/*.config.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
