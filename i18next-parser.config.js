// Official i18next-parser configuration
// https://github.com/i18next/i18next-parser
// Run: npm run i18n:extract
module.exports = {
  locales: ['en', 'ro'],
  output: 'src/i18n/extracted/$LOCALE.json',
  input: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
    '!src/**/*.d.ts',
    '!src/i18n/translations.ts'
  ],
  sort: true,
  createOldCatalogs: false,
  keepRemoved: false,
  verbose: true,
  failOnWarnings: false,
  failOnUpdate: false,
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: [{
      lexer: 'JsxLexer',
      functions: ['t'],
      attr: 'i18nKey',
      componentFunctions: ['Trans']
    }],
  },
  lineEnding: 'auto',
  defaultNamespace: 'translation',
  defaultValue: (locale, namespace, key) => `__MISSING_${locale.toUpperCase()}__`,
  indentation: 2,
  namespaceSeparator: false,
  keySeparator: '.',
};
