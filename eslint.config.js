// Flat ESLint config — STATIC glitch layer.
// The react-hooks rules catch the two glitch classes the runtime harness can't
// reliably reproduce:
//   • rules-of-hooks  → conditional/early-return hooks = the #310 "Rendered
//     fewer hooks than expected" crash class (lived 7 versions undetected).
//   • exhaustive-deps → stale-closure deps in useEffect/useMemo/useCallback,
//     a top cause of flicker (effects firing on the wrong value / re-render loops).
// Scope: src TS/TSX only. Run: `npm run lint`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'android/**', 'scripts/**', '**/*.bak*', '**/*.generated.ts'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { 'react-hooks': reactHooks, '@typescript-eslint': tseslint.plugin },
    rules: {
      // THE GLITCH-PREVENTION RULES:
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Register (off) so in-source eslint-disable directives resolve cleanly,
      // keeping the report's signal = hooks only.
      '@typescript-eslint/no-explicit-any': 'off',
      'no-useless-assignment': 'off',
      // Keep the static pass focused on glitch signals — silence stylistic TS noise
      // so the hook violations aren't buried. (This is a glitch lint, not a full lint.)
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
      'no-cond-assign': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
      'no-fallthrough': 'off',
      'no-misleading-character-class': 'off',
      'no-async-promise-executor': 'off',
      'no-extra-boolean-cast': 'off',
      'no-irregular-whitespace': 'off',
      'no-self-assign': 'off',
      'no-sparse-arrays': 'off',
    },
  },
);
