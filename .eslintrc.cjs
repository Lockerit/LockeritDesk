module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint','react','react-hooks','import','unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }]
  }
};
