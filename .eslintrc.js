module.exports =
{
    parserOptions:
    {
        ecmaVersion: 6,
        globalReturn: true,
        impliedStrict: true,
    },
    env:
    {
        es6: true,
        node: true,
    },
    extends: 'eslint:recommended',
    plugins:
    [
        'promise',
    ],
    rules:
    {
        'promise/always-catch':     'warn',
        'promise/always-return':    'warn',
        'array-bracket-spacing':       ['warn', 'never', { arraysInArrays: false, objectsInArrays: false }],
        'block-scoped-var':            'error',
        'block-spacing':               ['warn', 'always'],
        'brace-style':                 ['warn', 'allman', { 'allowSingleLine': true }],
        'comma-dangle':                ['warn', 'always-multiline'],
        'comma-spacing':               ['warn', { 'before': false, 'after': true }],
        'comma-style':                 ['error', 'last'],
        complexity:                    ['warn', 15],
        curly:                         ['warn', 'all'],
        'dot-notation':                'warn',
        'eol-last':                    'warn',
        'handle-callback-err':         'warn',
        'keyword-spacing':             ['warn',
        {
            before: true,
            after:  true,
            overrides:
            {
                if:       { after: false },
                for:      { after: false },
                while:    { after: false },
                continue: { after: false },
            }
        }],
        'linebreak-style':             ['warn', 'unix'],
        'no-bitwise':                  'warn',
        'no-console' :                 'off',
        'no-fallthrough':              'warn',
        'no-loop-func':                'error',
        'no-nested-ternary':           'error',
        'no-param-reassign':        ['warn', { props: false }],
        'no-redeclare':                ['error', { builtinGlobals: true }],
        'no-return-assign':            ['error', 'always'],
        'no-self-compare':             'error',
        'no-sequences':                'error',
        'no-spaced-func':              'warn',
        'no-trailing-spaces':          'warn',
        'no-unexpected-multiline':     'error',
        'no-unneeded-ternary':         'error',
        'no-unused-expressions':       ['error', { allowShortCircuit: true, allowTernary: true }],
        'no-unused-vars':              ['warn', {args: 'after-used'}],
        'no-use-before-define':        ['error', 'nofunc'],
        // 'no-warning-comments':         [ 'warn', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
        'object-curly-spacing':        ['warn', 'always', { arraysInObjects: true }],
        'padded-blocks':               ['warn', 'never'],
        'quote-props':                 ['warn', 'as-needed', { keywords: true, numbers: true }],
        quotes:                        ['warn', 'single', 'avoid-escape'],
        semi:                          ['error', 'always'],
        'semi-spacing':                ['error', { before: false, after: true }],
        'space-before-blocks':         ['warn', { functions: 'always', keywords: 'always' }],
        'space-before-function-paren': ['warn', 'never'],
        'space-in-parens':             ['warn', 'never'],
        'space-infix-ops':             'warn',
        'space-unary-ops':             ['warn', { words: true, nonwords: false }],
    },
};
