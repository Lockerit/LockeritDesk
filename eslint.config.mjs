// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const SRC = ['src/**/*.{ts,tsx,js,jsx}'];
const MAIN = ['electron/**/*.{ts,js}', 'electron.{ts,js}', 'vite.config.*'];

export default [
  // Ignora artefactos
  { ignores: ['dist', 'release', 'build', 'out', '**/*.d.ts'] },

  // === Renderer (React) ===
  { ...js.configs.recommended, files: SRC, languageOptions: { globals: { ...globals.browser } } },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: SRC })), // TS (no type-checked)
  { ...reactHooks.configs['recommended-latest'], files: SRC },
  { ...reactRefresh.configs.vite, files: SRC },

  // Reglas y opciones propias del renderer
  {
    files: SRC,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        // Para type-aware linting, añade:
        // project: './tsconfig.json',
        // tsconfigRootDir: new URL('.', import.meta.url),
      },
    },
    settings: { 'import/resolver': { typescript: true } },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]'}],
    },
  },

  // === Main y Preload (Node/Electron) ===
  { ...js.configs.recommended, files: MAIN, languageOptions: { globals: { ...globals.node } } },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: MAIN })),
  {
    files: MAIN,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
    },
  },
];
