'use strict';

module.exports =
{
    env:
    {
        mocha: true,
    },
    plugins:
    [
        'should-promised',
    ],
    rules:
    {
        'should-promised/return-promise': 'error',
        'sonarjs/no-duplicate-string':    'off',
        'sonarjs/no-identical-functions': 'off',
    }
};
