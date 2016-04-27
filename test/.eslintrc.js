module.exports =
{
    env:
    {
        mocha: true,
    },
    globals:
    {
        logger: true,
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
    }
};
