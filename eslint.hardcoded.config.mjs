// ESLint config for detecting hardcoded strings in JSX
// Uses @shopify/eslint-plugin jsx-no-hardcoded-content rule
// Run: npm run i18n:check-hardcoded

import shopifyPlugin from '@shopify/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/test/**', '**/*.test.tsx'],
    plugins: {
      '@shopify': shopifyPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      // Detect hardcoded content in JSX
      '@shopify/jsx-no-hardcoded-content': ['warn', {
        // Don't allow hardcoded strings
        allowStrings: false,
        // Allow numbers (like 0, 100, etc.)
        allowNumbers: true,
        // Check these props for hardcoded content
        checkProps: ['title', 'aria-label', 'placeholder', 'alt', 'label', 'message', 'header', 'subHeader'],
        // DOM element specific rules
        dom: {
          // Ignore Material Symbols icons - they use text content for icon names
          'span': {
            allowStrings: true, // Allow span content (often icons)
          },
          // Check these elements
          '*': {
            checkProps: ['title', 'aria-label'],
          },
          'input': {
            checkProps: ['title', 'placeholder', 'aria-label'],
          },
          'img': {
            checkProps: ['title', 'alt', 'aria-label'],
          },
          'button': {
            checkProps: ['title', 'aria-label'],
          },
        },
        // Module-specific rules to ignore icon components
        modules: {
          // Allow IonIcon to have hardcoded icon names
          '@ionic/react': {
            IonIcon: { allowStrings: true },
          },
        },
      }],
    },
  },
];
