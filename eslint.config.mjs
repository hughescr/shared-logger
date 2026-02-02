import config from '@hughescr/eslint-config-default';

export default [
    ...config,
    {
        ignores: [
            'node_modules/',

            '.stryker-tmp/',
            'reports/',
            'coverage/',

            '.serena/',

            '.claude/',
        ]
    },
    {
        rules: {
            'no-console':              'off',
            'n/no-missing-import':     'off',
            'n/no-unpublished-import': 'off'
        }
    }
];
