'use strict';

module.exports = {
    preset:                 'ts-jest/presets/default-esm',
    testEnvironment:        'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper:       {
        '^bun:test$': '<rootDir>/test/bun-test.ts'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.jest.json' }]
    }
};
