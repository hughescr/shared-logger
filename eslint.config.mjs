// eslint-disable-next-line n/no-unpublished-import -- This import is not published cos it's dev only
import defaultConfig from '@hughescr/eslint-config-default';
// eslint-disable-next-line n/no-unpublished-import -- This import is not published cos it's dev only
import tseslint from 'typescript-eslint';
// eslint-disable-next-line n/no-unpublished-import -- plugin is dev-only
import jestPlugin from 'eslint-plugin-jest';

export default
[
    {
        name: 'ignores',
        ignores: ['coverage', 'node_modules', 'venv'],
    },
    defaultConfig.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@stylistic/operator-linebreak': 'off',
            '@stylistic/max-statements-per-line': ['warn', { max: 2 }],
            'n/no-missing-import': 'off',
            'no-console': 'off',
        },
    },
    {
        files: ['**/*.js', '**/*.mjs'],
        ...tseslint.configs.disableTypeChecked,
    },
    {
        files: ['test/**/*.js', 'test/**/*.mjs'],
        ...jestPlugin.configs['flat/recommended'],
        ...jestPlugin.configs['flat/style'],
        rules: {
            'jest/no-conditional-in-test': 'off',
            'jest/no-done-callback': 'warn',
            'jest/no-duplicate-hooks': 'warn',
            'jest/prefer-comparison-matcher': 'warn',
            'jest/prefer-equality-matcher': 'warn',
            'jest/prefer-expect-assertions': 'warn',
            'jest/prefer-expect-resolves': 'error',
            'jest/prefer-hooks-in-order': 'error',
            'jest/prefer-hooks-on-top': 'error',
            'jest/prefer-spy-on': 'warn',
            'jest/prefer-strict-equal': 'warn',
            'jest/require-hook': 'off',
            'jest/require-top-level-describe': 'error',
        },
    },
];
