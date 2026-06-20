import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // Base JS
  js.configs.recommended,

  // TS (fast rules)
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: [
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'dist',
      'node_modules',
      'src/tests/example.test.ts',
      'test/mocks/mock-exporter.ts',
      'ui/demo/app.ts',
    ],
  },

  // Main app rules
  {
    files: [
      'src/**/*.{ts,tsx}',
      'ui/**/*.{ts,tsx}',
      'cypress/**/*.ts',
      //'**/**.json',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // 🔒 Prevent messy code
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      // 🧠 TypeScript discipline
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // 📦 Clean imports
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Demo app uses automatic @trace propagation via stack context
  {
    files: ['ui/demo/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Tests relaxed
  {
    files: ['**/*.test.ts', 'cypress/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // ❗ MUST BE LAST → disables formatting conflicts
  prettier,
)
