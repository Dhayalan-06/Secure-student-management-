import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, react.configs.flat.recommended, react.configs.flat['jsx-runtime']],
    languageOptions: { globals: globals.browser },
    settings: { react: { version: 'detect' } },
    rules: { 'react/prop-types': 'off' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['src/**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: { globals: globals.jest },
  },
  prettier,
]);
