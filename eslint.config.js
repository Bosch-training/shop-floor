const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');

const styleRules = {
  semi: ['error', 'always'],
  quotes: ['error', 'single', { avoidEscape: true }],
  camelcase: ['error', { properties: 'never' }],
  'max-len': ['error', { code: 80, ignoreUrls: true }],
};

module.exports = [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'docs/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: styleRules,
  },
  {
    files: ['server/**/*.test.js', 'server/tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
  {
    ...react.configs.flat.recommended,
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...styleRules,
      'react/prop-types': 'off',
    },
  },
  {
    files: ['client/vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
