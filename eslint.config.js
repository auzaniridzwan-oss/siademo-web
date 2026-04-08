import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: { 'no-console': 'error' },
  },
  {
    files: ['src/managers/AppLogger.js', 'src/managers/StorageManager.js'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['api/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    files: ['vite.config.js', 'postcss.config.js', 'tailwind.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
];
