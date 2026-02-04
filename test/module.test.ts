import { describe, it, expect, afterEach, jest, spyOn } from 'bun:test';

import * as loggers from '../src/index.ts';
const logger        = loggers.logger;
const expressLogger = loggers.middleware;
const loggerStream  = logger.morganStream;

import http from 'node:http';
import request from 'supertest';

import morgan from 'morgan';

import _ from 'lodash';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WriteStream } from 'node:tty';

interface ConsoleWithStreams extends Console {
    _stdout: WriteStream
    _stderr: WriteStream
}

interface ExpressRequestWithUser extends IncomingMessage {
    user?:  { _id: string }
    route?: { path: string }
}

type LoggerMethods = 'info' | 'warn' | 'error' | 'debug';

const okResponse = (req: IncomingMessage, res: ServerResponse) =>
    expressLogger(req, res, function onNext() { res.end('OK'); });

const __filename = fileURLToPath(import.meta.url);
const myTestPath = __filename.slice(__filename.lastIndexOf(path.sep, __filename.lastIndexOf(path.sep) - 1) + 1, __filename.length);

const consoleStreams = console as unknown as ConsoleWithStreams & Record<string, (...args: unknown[]) => void>;

const methodLogger = logger as unknown as Record<LoggerMethods, (...args: unknown[]) => void>;
const morganExtras = morgan as unknown as Record<string, unknown>;

describe('Logging', () => {
    describe('Basic logger', () => {
        it('should provide a "logger" and "middleware"', () => {
            expect.assertions(3);
            expect(loggers.middleware).toBeInstanceOf(Object);
            expect(loggers).toHaveProperty('logger', expect.objectContaining({ level: 'debug' }));
            expect(loggers).toHaveProperty('noprefix', 'noprefix');
        });

        it('morgan should have some things defined', () => {
            expect.assertions(4);
            expect(morgan).toHaveProperty('timestamp', expect.any(Function));
            expect(morgan).toHaveProperty('route', expect.any(Function));
            expect(morgan).toHaveProperty('user', expect.any(Function));
            expect(morgan).toHaveProperty('mydev', expect.any(Function));
        });

        describe('Methods', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            _.forEach(['info', 'warn', 'error', 'debug'], (level) => {
                it(`logger should have a method for logging at level ${level}`, () => {
                    expect.assertions(1);
                    expect(logger).toHaveProperty(level, expect.any(Function));
                });

                it(`logging at level ${level} should have proper format`, () => {
                    expect.assertions(1);
                    // Jest hooks consoleStreams._stderr up to stdout so we need to undo that to test here
                    const oldStderr = consoleStreams._stderr;
                    consoleStreams._stderr = process.stderr;
                    const spyOnStream = spyOn((level == 'error' || level == 'debug') ? consoleStreams._stderr : consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
                    methodLogger[level as LoggerMethods]('hi');
                    consoleStreams._stderr = oldStderr;

                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${level.toLocaleUpperCase()}\\] hi\\n$`)));
                });
            });
        });

        it('logging should allow passing an object', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('hi', { some: 'object' });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hi \{"some":"object"\}\n$/));
        });

        it('logging should handle multiple string arguments', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('hello', 'world');

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hello world\n$/));
        });

        it('logging should handle multiple strings followed by object', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('hello', 'world', { obj: 1 });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hello world \{"obj":1\}\n$/));
        });

        it('logging should handle object followed by object', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info({ obj: 1 }, { other: 2 });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] \{"obj":1\} \{"other":2\}\n$/));
        });

        it('logging should handle three strings', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('hello', 'world', 'test');

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hello world test\n$/));
        });

        it('logging should handle multiple non-object args after strings', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('hello', 123, 456);

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hello \{"0":123,"1":456\}\n$/));
        });

        it('logging should handle string with multiple objects', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('hello', { a: 1 }, { b: 2 });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hello \{"a":1,"b":2\}\n$/));
        });

        it('logging should handle two objects without strings', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info({ a: 1 }, { b: 2 });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] \{"a":1\} \{"b":2\}\n$/));
        });

        it('logging should handle single non-object primitive', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info(123);

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] 123\n$/));
        });

        it('logging should handle number followed by object', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info(123, { meta: 'data' });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] 123 \{"meta":"data"\}\n$/));
        });

        it('logging should allow empty message', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[.*\] \[INFO\]\n$/));
        });

        it('logging with zero args should not have metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info();

            expect(spyOnStream).toHaveBeenCalledWith(expect.not.stringMatching(/\{.*\}/));
        });

        it('logging with one arg should not have metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('single');

            expect(spyOnStream).toHaveBeenCalledWith(expect.not.stringMatching(/single[^\n\r{\u2028\u2029]*\{.*\}/));
        });

        it('logging with two strings should not include metadata braces', () => {
            expect.assertions(2);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('first', 'second');

            const output = spyOnStream.mock.calls[spyOnStream.mock.calls.length - 1][0];
            expect(output).toMatch(/\[INFO\] first second\n$/);
            // Critical: no braces should appear (would fail if empty metadata {} is added)
            expect(output).not.toContain('{');
        });

        it('logging with string and number should include metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info('msg', 123);

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\{"0":123\}/));
        });

        it('logging with 0 args should produce exactly undefined message with no metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[.*\] \[INFO\]\n$/));
        });

        it('logging with 2+ args where first is not string should have metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info(null, { meta: 'data' });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\{"meta":"data"\}/));
        });

        it('logging with single object should use that object directly as metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            const metaObj = { direct: 'reference' };
            methodLogger.info('message', metaObj);

            // Verify the exact object content appears in output
            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\{"direct":"reference"\}/));
        });

        it('logging should message with just object', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            methodLogger.info({ some: 'object' });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] \{"some":"object"\}\n$/));
        });
    });

    describe('Console', () => {
        it('logger should be able to interceptConsole', () => {
            expect.assertions(1);
            expect(logger).toHaveProperty('interceptConsole', expect.any(Function));
        });

        it('logger should be able to restoreConsole', () => {
            expect.assertions(1);
            expect(logger).toHaveProperty('restoreConsole', expect.any(Function));
        });

        it('intercepting and restoring console should work', () => {
            expect.assertions(10);
            const orig_console: Record<string, (...args: unknown[]) => void> = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                orig_console[f] = consoleStreams[f];
            });
            logger.interceptConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                expect(consoleStreams[f]).not.toBe(orig_console[f]);
            });
            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                expect(consoleStreams[f]).toBe(orig_console[f]);
            });
        });

        it('intercepting and restoring console multiple times should work', () => {
            expect.assertions(15);
            const orig_console: Record<string, (...args: unknown[]) => void> = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                orig_console[f] = consoleStreams[f];
            });
            logger.interceptConsole();
            logger.interceptConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                expect(consoleStreams[f]).not.toBe(orig_console[f]);
            });

            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                expect(consoleStreams[f]).toBe(orig_console[f]);
            });
            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                expect(consoleStreams[f]).toBe(orig_console[f]);
            });
        });

        it('intercepting twice then restoring once should reset console', () => {
            expect.assertions(8);
            const orig_console: Record<string, (...args: unknown[]) => void> = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                orig_console[f] = consoleStreams[f];
            });

            logger.interceptConsole();
            logger.interceptConsole();

            const spyOnInfo = spyOn(methodLogger, 'info').mockImplementation((..._args: unknown[]) => _.noop());
            console.log('during');
            expect(spyOnInfo).toHaveBeenCalledWith('during', { source: 'console' });

            logger.restoreConsole();
            spyOnInfo.mockClear();
            const origLogSpy = spyOn(consoleStreams, 'log').mockImplementation((..._args: unknown[]) => _.noop());
            console.log('after');
            expect(spyOnInfo).not.toHaveBeenCalled();
            expect(origLogSpy).toHaveBeenCalledWith('after');
            origLogSpy.mockRestore();
            spyOnInfo.mockRestore();

            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
                expect(consoleStreams[f]).toBe(orig_console[f]);
            });
        });

        describe('Methods', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            _.forEach(['log', 'info', 'warn'], (level) => {
                it(`Check level ${level} on console with no arg`, () => {
                    expect.assertions(1);
                    const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
                    logger.interceptConsole();
                    consoleStreams[level]();
                    logger.restoreConsole();
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${_.toUpper(_.replace(level, 'log', 'info'))}\\] \\{"source":"console"\\}\\n$`)));
                });

                it(`Check level ${level} on console`, () => {
                    expect.assertions(1);
                    const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
                    logger.interceptConsole();
                    consoleStreams[level]('hi');
                    logger.restoreConsole();
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${_.toUpper(_.replace(level, 'log', 'info'))}\\] hi \\{"source":"console"\\}\\n$`)));
                });
            });

            it('Check level error on console with no arg', () => {
                expect.assertions(1);
                // Jest hooks consoleStreams._stderr up to stdout so we need to undo that to test here
                const oldStderr = consoleStreams._stderr;
                consoleStreams._stderr = process.stderr;
                const spyOnStream = spyOn(consoleStreams._stderr, 'write').mockImplementation(_.constant(true));
                logger.interceptConsole();
                console.error();
                logger.restoreConsole();
                consoleStreams._stderr = oldStderr;

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[ERROR\\] \\{"source":"console","stacktrace":"[^)]*${myTestPath}:[^}]*\\}\n$`)));
            });

            it('Check level error on console', () => {
                expect.assertions(1);
                // Jest hooks consoleStreams._stderr up to stdout so we need to undo that to test here
                const oldStderr = consoleStreams._stderr;
                consoleStreams._stderr = process.stderr;
                const spyOnStream = spyOn(consoleStreams._stderr, 'write').mockImplementation(_.constant(true));
                logger.interceptConsole();
                console.error('hi');
                logger.restoreConsole();
                consoleStreams._stderr = oldStderr;

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[ERROR\\] hi \\{"source":"console","stacktrace":"[^)]*${myTestPath}:[^}]*\\}\n$`)));
            });

            it('Check dir helper on console', () => {
                expect.assertions(1);
                const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
                logger.interceptConsole();
                console.dir({ some: 'object' });
                logger.restoreConsole();

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \[INFO\] \{ some: 'object' \} \{"source":"console"\}\n$/));
            });
        });

        it('console logging an empty message should work', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            logger.interceptConsole();
            console.log();
            logger.restoreConsole();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] \{"source":"console"\}\n$/));
        });

        it('console logging overriding source should work', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            logger.interceptConsole();
            console.log('hi', { source: 'other' });
            logger.restoreConsole();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hi \{"source":"other"\}\n$/));
        });

        it('console logging an object should work', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            logger.interceptConsole();
            console.log('hi', { some: 'object' });
            logger.restoreConsole();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hi \{"some":"object","source":"console"\}\n$/));
        });

        it('console interception should add source when last arg is non-plain-object', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            logger.interceptConsole();
            // Pass an array (truthy but not a plain object)
            // With &&: evaluates _.isPlainObject([1,2]) = false, so hasExistingSource = false, source added
            // With ||: short-circuits to true (array is truthy), so hasExistingSource = true, source NOT added (WRONG!)
            console.log('test', [1, 2]);
            logger.restoreConsole();

            // Should have source: console added (not treated as existing source)
            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] test \{"0":\[1,2\],"source":"console"\}\n$/));
        });

        it('restoreConsole called before interceptConsole should be safe no-op', () => {
            expect.assertions(1);

            // Get a fresh module state by checking console functions exist
            const originalLog = console.log;

            // Call restoreConsole when never intercepted - should be no-op
            // If the guard is removed, _.assign(console, null) would throw or corrupt console
            logger.restoreConsole();

            // Console methods should be unchanged
            expect(console.log).toBe(originalLog);
        });
    });

    describe('Express', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should provide a logging middleware for express', () => {
            expect.assertions(1);
            expect(expressLogger).toBeInstanceOf(Function);
        });

        it('should provide a stream for logger', () => {
            expect.assertions(1);
            expect(loggerStream).toHaveProperty('write', expect.any(Function));
        });

        it('express middleware should log things', async () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            return request(http.createServer(okResponse))
            .get('/some/path')
            .set('Referrer', 'http://example.com/some/referrer')
            .expect(() => {
                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \S*GET \/some\/path \*\*\* [^ ]*32m200 \S*[\d.]ms http:\/\/example.com\/some\/referrer [^[]*\[[^\]]*\] ~-~\n$/));
            });
        });

        it('express middleware should create color formatter which is re-used', async () => {
            expect.assertions(6);
            spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));
            let origFormatter: unknown;

            return request(http.createServer(okResponse))
            .get('/some/path')
            .expect(() => {
                expect(morganExtras).toHaveProperty('mydev');
                const mydev = morganExtras.mydev as Record<string, unknown>;
                expect(mydev).toHaveProperty('colorFormatter32');
                expect(mydev.colorFormatter32).toBeInstanceOf(Function);
                origFormatter = mydev.colorFormatter32;
            })
            .then(() => {
                return request(http.createServer(okResponse))
                .get('/some/path')
                .expect(() => {
                    expect(morganExtras).toHaveProperty('mydev');
                    const mydev2 = morganExtras.mydev as Record<string, unknown>;
                    expect(mydev2).toHaveProperty('colorFormatter32');
                    expect(mydev2.colorFormatter32).toBe(origFormatter);
                });
            });
        });

        it('express middleware should handle request details', async () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            return request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    (req as ExpressRequestWithUser).user = { _id: 'fake_user_id' };
                    (req as ExpressRequestWithUser).route = { path: '/some/fake/route/path' };
                    res.end('OK');
                });
            }))
                .get('/some/path')
                .set('Referrer', 'http://example.com/some/referrer')
                .expect(() => {
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \S*GET \/some\/path \/some\/fake\/route\/path [^ ]*32m200 \S*[\d.]ms http:\/\/example.com\/some\/referrer [^[]*\[[^\]]*\] ~fake_user_id~\n$/));
                });
        });

        it('express middleware should handle case of logging where there is no res._header', () => {
            expect.assertions(1);
            const req = {
                method:     'GET',
                url:        '/some/path',
                headers:    { referrer: 'http://example.com/some/referrer' },
                connection: { remoteAddress: '127.0.0.1' },
                _startAt:   [0, 0],
            } as unknown as IncomingMessage;
            const res = {
                statusCode: 200,
                _header:    undefined,
                _startAt:   [0, 0],
            } as unknown as ServerResponse;

            const line = (morgan as unknown as Record<string, unknown>).mydev as (tokens: morgan.TokenIndexer<IncomingMessage, ServerResponse>, req: IncomingMessage, res: ServerResponse) => string;

            const output = line(morgan as unknown as morgan.TokenIndexer<IncomingMessage, ServerResponse>, req, res);
            expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \x1b\[90mGET \/some\/path \*\*\* \x1b\[32m- \x1b\[90m0\.00000ms http:\/\/example.com\/some\/referrer \x1b\[0m\[127.0.0.1\] ~-~$/);
        });

        _.forEach([
            [200, 32],
            [300, 36],
            [400, 33],
            [500, 31],
        ], (status_color) => {
            it(`express middleware should colorize status ${status_color[0]} properly`, async () => {
                expect.assertions(2);
                const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

                return request(http.createServer((req, res) => {
                    return expressLogger(req, res, function onNext() {
                        res.writeHead(status_color[0]);
                        res.end();
                    });
                }))
                .get('/some/path')
                .set('Referrer', 'http://example.com/some/referrer')
                .expect(() => {
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\S*GET /some/path \\*\\*\\* [^ ]*${status_color[1]}m${status_color[0]} \\S*[0-9.]+ms http://example.com/some/referrer \\S*\\[[^\\]]*\\] ~-~\\n$`)));
                    const mydevColor = morganExtras.mydev as Record<string, unknown>;
                    expect(mydevColor).toHaveProperty(`colorFormatter${status_color[1]}`, expect.any(Function));
                });
            });
        });
    });

    describe('Edge cases', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should handle circular references without throwing', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            const circular: Record<string, unknown> = { name: 'test' };
            circular.self = circular;

            // Should not throw
            methodLogger.info('circular test', circular);

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] circular test \[Unserializable\]/));
        });

        it('should handle BigInt values without throwing', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            const data = { big: BigInt(9007199254740991) };

            // Should not throw
            methodLogger.info('bigint test', data);

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] bigint test \[Unserializable\]/));
        });

        it('should handle frozen objects in console interception', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            logger.interceptConsole();
            const frozen = Object.freeze({ immutable: 'data' });

            // Should not throw - we no longer mutate user objects
            console.log('frozen test', frozen);
            logger.restoreConsole();

            // The frozen object should be logged, and source: console added separately
            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] frozen test/));
        });

        it('should handle array metadata correctly (not spread into numbered keys)', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            methodLogger.info('array test', [1, 2, 3]);

            // Arrays should become { "0": [1,2,3] }, not spread into { "0": 1, "1": 2, "2": 3 }
            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] array test \{"0":\[1,2,3\]\}/));
        });

        it('should handle unicode and special characters', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            methodLogger.info('unicode: 你好 🎉 émojis');

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] unicode: 你好 🎉 émojis/));
        });

        it('should handle very large objects', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            const largeObj: Record<string, number> = {};
            for(let i = 0; i < 1000; i++) {
                largeObj[`key${i}`] = i;
            }

            // Should not throw or hang
            methodLogger.info('large object', largeObj);

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] large object \{.*"key999":999.*\}/));
        });

        it('should handle null and undefined in metadata', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            methodLogger.info('nullish test', { nullVal: null, undefVal: undefined });

            // undefined values are typically omitted by JSON.stringify, null is preserved
            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] nullish test \{"nullVal":null\}/));
        });

        it('logger.json() should log structured data', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            logger.json({ event: 'test_event', value: 42 });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\].*"event":"test_event".*"value":42/));
        });

        it('logger.json() should output without message prefix', () => {
            expect.assertions(1);
            const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

            logger.json({ event: 'test' });

            // The format should be: [timestamp] [INFO] {"event":"test"} - no message text between [INFO] and the JSON
            // NOT: [timestamp] [INFO] some_message {"event":"test"}
            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] \{"event":"test"\}\n$/));
        });

        it('type guard exports should work correctly', () => {
            expect.assertions(5);

            // Import the type guards - they should be functions
            expect(loggers).toHaveProperty('isErrorEnabled', expect.any(Function));
            expect(loggers).toHaveProperty('isWarnEnabled', expect.any(Function));
            expect(loggers).toHaveProperty('isInfoEnabled', expect.any(Function));
            expect(loggers).toHaveProperty('isDebugEnabled', expect.any(Function));
            expect(loggers).toHaveProperty('isLevelEnabled', expect.any(Function));
        });

        it('type guards should return correct values', () => {
            expect.assertions(5);

            // With default level 'debug', all levels should be enabled
            expect((loggers as unknown as Record<string, () => boolean>).isErrorEnabled()).toBe(true);
            expect((loggers as unknown as Record<string, () => boolean>).isWarnEnabled()).toBe(true);
            expect((loggers as unknown as Record<string, () => boolean>).isInfoEnabled()).toBe(true);
            expect((loggers as unknown as Record<string, () => boolean>).isDebugEnabled()).toBe(true);
            expect((loggers as unknown as Record<string, (level: string) => boolean>).isLevelEnabled('info')).toBe(true);
        });

        it('morganStream should pass errors to callback when logger.log throws', () => {
            expect.assertions(2);

            // Save original logger.log
            const originalLog = logger.log.bind(logger);

            // Mock logger.log to throw
            (logger as unknown as Record<string, unknown>).log = function() {
                throw new Error('Test error from logger.log');
            };

            // Spy on the callback to capture the error passed to it
            let capturedError: Error | null | undefined;
            const mockCallback = (err?: Error | null) => {
                capturedError = err;
            };

            // Get the write implementation from morganStream
            // eslint-disable-next-line @typescript-eslint/unbound-method -- Need to access internal write method
            const writeImpl = logger.morganStream._write;

            // Call write directly with our mock callback
            writeImpl.call(logger.morganStream, Buffer.from('test message'), 'utf8', mockCallback);

            // Restore logger.log before assertions
            (logger as unknown as Record<string, unknown>).log = originalLog;

            // Verify the callback received the error
            expect(capturedError).toBeInstanceOf(Error);
            expect(capturedError!.message).toBe('Test error from logger.log');
        });

        it('morganStream should wrap non-Error throws in Error', () => {
            expect.assertions(2);

            // Save original logger.log
            const originalLog = logger.log.bind(logger);

            // Mock logger.log to throw a string (non-Error)
            (logger as unknown as Record<string, unknown>).log = function() {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- Intentionally testing non-Error throw handling
                throw 'string error';
            };

            // Spy on the callback to capture the error passed to it
            let capturedError: Error | null | undefined;
            const mockCallback = (err?: Error | null) => {
                capturedError = err;
            };

            // Get the write implementation from morganStream
            // eslint-disable-next-line @typescript-eslint/unbound-method -- Need to access internal write method
            const writeImpl = logger.morganStream._write;

            // Call write directly with our mock callback
            writeImpl.call(logger.morganStream, Buffer.from('test message'), 'utf8', mockCallback);

            // Restore logger.log before assertions
            (logger as unknown as Record<string, unknown>).log = originalLog;

            // Verify the callback received the wrapped error
            expect(capturedError).toBeInstanceOf(Error);
            expect(capturedError!.message).toBe('string error');
        });
    });

    describe('Timezone configuration', () => {
        // Tests that verify initial module state - no afterEach cleanup here
        // to ensure we're testing the actual initial value, not a reset value
        describe('Initial state', () => {
            it('should export timezone functions', () => {
                expect.assertions(3);
                expect(loggers).toHaveProperty('getTimezone', expect.any(Function));
                expect(loggers).toHaveProperty('setTimezone', expect.any(Function));
                expect(loggers).toHaveProperty('resetTimezone', expect.any(Function));
            });

            it('default timezone should be UTC', () => {
                expect.assertions(1);
                expect(loggers.getTimezone()).toBe('UTC');
            });
        });

        // Tests that modify timezone state - afterEach ensures cleanup
        describe('Timezone operations', () => {
            afterEach(() => {
                jest.restoreAllMocks();
                loggers.resetTimezone();
            });

            it('setTimezone should update the current timezone', () => {
                expect.assertions(2);
                loggers.setTimezone('America/New_York');
                expect(loggers.getTimezone()).toBe('America/New_York');

                loggers.setTimezone('Europe/London');
                expect(loggers.getTimezone()).toBe('Europe/London');
            });

            it('setTimezone should throw for invalid timezone', () => {
                expect.assertions(2);
                expect(() => loggers.setTimezone('Invalid/Timezone')).toThrow('Invalid timezone');
                expect(() => loggers.setTimezone('NotATimezone')).toThrow('Must be a valid IANA timezone identifier');
            });

            it('resetTimezone should restore UTC', () => {
                expect.assertions(2);
                loggers.setTimezone('Asia/Tokyo');
                expect(loggers.getTimezone()).toBe('Asia/Tokyo');

                loggers.resetTimezone();
                expect(loggers.getTimezone()).toBe('UTC');
            });

            it('UTC timestamps should end with Z', () => {
                expect.assertions(1);
                const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

                loggers.resetTimezone();
                methodLogger.info('UTC test');

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/));
            });

            it('non-UTC timestamps should have offset notation', () => {
                expect.assertions(1);
                const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

                loggers.setTimezone('America/New_York');
                methodLogger.info('Eastern test');

                // Non-UTC timezones produce offset notation like +05:00 or -05:00
                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}\]/));
            });

            it('morgan middleware should respect timezone setting', async () => {
                expect.assertions(1);
                const spyOnStream = spyOn(consoleStreams._stdout, 'write').mockImplementation(_.constant(true));

                loggers.setTimezone('America/Los_Angeles');

                return request(http.createServer(okResponse))
                    .get('/timezone/test')
                    .expect(() => {
                        // Morgan also uses LUXON_FORMAT_NOW via the timestamp token, so should show offset
                        expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}\]/));
                    });
            });
        });
    });
});
