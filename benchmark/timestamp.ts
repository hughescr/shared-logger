/**
 * Benchmark script for comparing timestamp generation approaches.
 *
 * Usage with hyperfine:
 *   hyperfine 'bun run benchmark/timestamp.ts --current' \
 *             'bun run benchmark/timestamp.ts --native'
 *
 * Or run directly:
 *   bun run benchmark/timestamp.ts --all
 */

import { DateTime } from 'luxon';

const ITERATIONS = 100_000;

function benchmarkLuxon(): void {
    const start = performance.now();
    for(let i = 0; i < ITERATIONS; i++) {
        DateTime.utc().toISO();
    }
    const elapsed = performance.now() - start;
    console.log(`Luxon DateTime.utc().toISO(): ${elapsed.toFixed(2)}ms for ${ITERATIONS} iterations`);
    console.log(`  Per call: ${(elapsed / ITERATIONS * 1000).toFixed(3)}µs`);
}

function benchmarkNative(): void {
    const start = performance.now();
    for(let i = 0; i < ITERATIONS; i++) {
        new Date().toISOString();
    }
    const elapsed = performance.now() - start;
    console.log(`Native Date.toISOString(): ${elapsed.toFixed(2)}ms for ${ITERATIONS} iterations`);
    console.log(`  Per call: ${(elapsed / ITERATIONS * 1000).toFixed(3)}µs`);
}

const arg = process.argv[2];

switch(arg) {
    case '--current':
    case '--luxon':
        benchmarkLuxon();
        break;
    case '--native':
        benchmarkNative();
        break;
    case '--all':
    default:
        console.log('Timestamp Generation Benchmark\n');
        benchmarkLuxon();
        console.log('');
        benchmarkNative();
        break;
}
