// eslint-disable-next-line n/no-unpublished-import -- dev dependency
import { defineConfig } from 'eslint/config';
// eslint-disable-next-line n/no-unpublished-import -- dev dependency
import defaultConfig from '@hughescr/eslint-config-default';

// eslint-disable-next-line n/no-unpublished-import -- dev dependency
import jestPlugin from 'eslint-plugin-jest';

export default defineConfig(
    {
        name:    'local-project-ignores',
        ignores: ['coverage', 'node_modules', 'venv'],
    },

    defaultConfig,

    {
        rules: {
            '@stylistic/operator-linebreak':      'off',
            '@stylistic/max-statements-per-line': ['warn', { max: 2 }],
            'n/no-missing-import':                'off',
            'no-console':                         'off',
        },
    },

    {
        files: ['test/**/*.js', 'test/**/*.mjs'],
        ...jestPlugin.configs['flat/recommended'],
        ...jestPlugin.configs['flat/style'],
        rules: {
            'jest/no-conditional-in-test':     'off',
            'jest/no-done-callback':           'warn',
            'jest/no-duplicate-hooks':         'warn',
            'jest/prefer-comparison-matcher':  'warn',
            'jest/prefer-equality-matcher':    'warn',
            'jest/prefer-expect-assertions':   'warn',
            'jest/prefer-expect-resolves':     'error',
            'jest/prefer-hooks-in-order':      'error',
            'jest/prefer-hooks-on-top':        'error',
            'jest/prefer-spy-on':              'warn',
            'jest/prefer-strict-equal':        'warn',
            'jest/require-hook':               'off',
            'jest/require-top-level-describe': 'error',
        },
    }
);
