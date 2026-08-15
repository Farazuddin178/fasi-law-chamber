import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // '.venv' and 'output' hold Python/vendor JS that ESLint cannot parse and
  // that we do not own — without these, `pnpm lint` reports parse errors from
  // selenium's bundled scripts and drowns out real findings.
  {
    ignores: [
      'dist',
      'node_modules',
      '.venv',
      'output',
      '__pycache__',
      'android',
      'ios',
      'tshc-causelist-app-final',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // A blanket @ts-nocheck is still flagged, but one that states why it is
      // there (e.g. a third-party typing incompatibility) is allowed.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-nocheck': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
    },
  },
)
