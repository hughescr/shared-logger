import _ from 'lodash';
import { performance } from 'perf_hooks';

const iterations = 100000;

const withEarlyReturn = (args) => {
    const argCount = args.length;
    if(argCount < 2) {
        return { message: args[0] };
    }
    const stringArgs = [];
    for(const arg of args) {
        if(!_.isString(arg)) { break; }
        stringArgs.push(arg);
    }
    const hasStrings = stringArgs.length > 0;
    const message = hasStrings ? stringArgs.join(' ') : args[0];
    const remainingArgs = args.slice(hasStrings ? stringArgs.length : 1);
    const remainingCount = remainingArgs.length;
    const result = { message };
    if(remainingCount > 0) {
        const metadataObjects = _.map(remainingArgs, (arg, idx) =>
            (_.isObject(arg) ? arg : { [idx]: arg })
        );
        result.metadata = _.assign({}, ...metadataObjects);
    }
    return result;
};

const withoutEarlyReturn = (args) => {
    const stringArgs = [];
    for(const arg of args) {
        if(!_.isString(arg)) { break; }
        stringArgs.push(arg);
    }
    const hasStrings = stringArgs.length > 0;
    const message = hasStrings ? stringArgs.join(' ') : args[0];
    const remainingArgs = args.slice(hasStrings ? stringArgs.length : 1);
    const remainingCount = remainingArgs.length;
    const result = { message };
    if(remainingCount > 0) {
        const metadataObjects = _.map(remainingArgs, (arg, idx) =>
            (_.isObject(arg) ? arg : { [idx]: arg })
        );
        result.metadata = _.assign({}, ...metadataObjects);
    }
    return result;
};

// Single arg case (most common for single-arg calls)
const start1 = performance.now();
for(let i = 0; i < iterations; i++) {
    withEarlyReturn(['single']);
}
const time1 = performance.now() - start1;

const start2 = performance.now();
for(let i = 0; i < iterations; i++) {
    withoutEarlyReturn(['single']);
}
const time2 = performance.now() - start2;

console.log('=== Single Argument (common case) ===');
console.log(`With early return: ${time1.toFixed(2)}ms`);
console.log(`Without early return: ${time2.toFixed(2)}ms`);
console.log(`Difference: ${(time1 - time2).toFixed(2)}ms (${((time1 / time2 - 1) * 100).toFixed(1)}%)`);

// Two args case (to see if early return helps)
const start3 = performance.now();
for(let i = 0; i < iterations; i++) {
    withEarlyReturn(['first', 'second']);
}
const time3 = performance.now() - start3;

const start4 = performance.now();
for(let i = 0; i < iterations; i++) {
    withoutEarlyReturn(['first', 'second']);
}
const time4 = performance.now() - start4;

console.log('\n=== Two Arguments ===');
console.log(`With early return: ${time3.toFixed(2)}ms`);
console.log(`Without early return: ${time4.toFixed(2)}ms`);
console.log(`Difference: ${(time3 - time4).toFixed(2)}ms (${((time3 / time4 - 1) * 100).toFixed(1)}%)`);
