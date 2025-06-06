// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    checkers: ['typescript'],
    typescriptChecker: {
        prioritizePerformanceOverAccuracy: true,
    },
    packageManager: 'yarn',
    reporters: ['html', 'clear-text', 'progress', 'dashboard'],
    testRunner: 'jest',
    jest: {
        enableFindRelatedTests: true,
    },
    coverageAnalysis: 'perTest',
    mutate: ['src/*.ts'],
    thresholds: { high: 100, low: 75, 'break': null },
    cleanTempDir: 'always',
    ignoreStatic: true,
};
export default config;
