import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      i18next,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      
      // i18next - detect hardcoded strings in JSX
      'i18next/no-literal-string': [
        'warn',
        {
          mode: 'jsx-text-only', // Only check text content in JSX
          // Regex patterns to ignore (formatting/separator characters)
          ignore: [
            '^[•/:()\\-–—,.\\s%]+$', // Punctuation only
            '^\\s*$',                 // Whitespace only
            '^[0-9]+$',               // Numbers only
          ],
          // Words to ignore (icon names, technical strings)
          words: {
            exclude: [
              // Common Material Symbols icons used in the app
              'eco', 'sync', 'storage', 'memory', 'inventory_2', 'add_circle',
              'expand_more', 'chevron_right', 'error', 'close', 'check_circle',
              'info', 'cloud_download', 'grass', 'arrow_back_ios_new',
              'water_drop', 'schedule', 'settings', 'home', 'thermostat',
              'wb_sunny', 'cloud', 'rainy', 'air', 'location_on', 'delete',
              'edit', 'save', 'cancel', 'add', 'remove', 'search', 'filter',
            ],
          },
        },
      ],
      
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'android/**',
      '**/*.test.tsx',
      '**/*.test.ts',
      'src/test/**',
    ],
  }
);
