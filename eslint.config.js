// eslint.config.js (flat, ESM)
import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import refreshPlugin from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import importPlugin from 'eslint-plugin-import';

export default [
  { ignores: ['dist/**','release/**','out/**','node_modules/**','electron/electron_cache/**','logs/**'] },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      'react-refresh': refreshPlugin,
      'unused-imports': unusedImports,
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,

      // React moderno
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-vars': 'warn',
      'react/prop-types': 'off',              // <— desactiva PropTypes

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Fast refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Imports
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
      'import/no-absolute-path': 'error',
      'import/newline-after-import': 'warn',
      'import/order': ['warn', {
        groups: ['builtin','external','internal',['parent','sibling','index'],'object','type'],
        pathGroups: [
          { pattern: '@{app,features,shared,services,assets}/**', group: 'internal' },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      }],

      // Varias
      'prefer-const': 'warn',
      'no-constant-binary-expression': 'error',
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        alias: {
          map: [
            ['@app', './src/app'],
            ['@features', './src/features'],
            ['@shared', './src/shared'],
            ['@services', './src/services'],
            ['@assets', './src/assets'],       // <— añade assets
          ],
          extensions: ['.js', '.jsx', '.json'],
        },
        node: { extensions: ['.js', '.jsx', '.json'] },
      },
    },
  },

  // Electron main/preload
  {
    files: ['electron/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
