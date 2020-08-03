'use strict';

module.exports =
{
    env:
    {
        mocha: true,
    },
    plugins:
    [
        'if-in-test',
        'should-promised',
    ],
    rules:
    {
        'if-in-test/if':                  ['warn', { directory: 'test' }],
        'should-promised/return-promise': 'error',
        'sonarjs/no-duplicate-string':    'off',
        'sonarjs/no-identical-functions': 'off',
    }
};
