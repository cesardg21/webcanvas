import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: [
            'vendor/**',
            'node_modules/**',
            'public/build/**',
            'storage/**',
            'bootstrap/cache/**',
        ],
    },
    {
        files: ['eslint.config.js', 'vite.config.js', 'resources/js/**/*.js'],
        extends: [js.configs.recommended],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },
    {
        files: ['resources/js/**/*.{ts,tsx}', 'tests/Unit/*.test.ts'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/consistent-type-imports': 'error',
            'no-self-compare': 'error',
        },
    },
    {
        files: ['resources/js/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
            'react-refresh/only-export-components': [
                'error',
                { allowConstantExport: true, allowExportNames: ['buttonVariants'] },
            ],
        },
    },
    prettier,
);
