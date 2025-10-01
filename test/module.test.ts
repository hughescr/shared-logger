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
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { orig_console[f] = consoleStreams[f]; });
            logger.interceptConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { expect(consoleStreams[f]).not.toBe(orig_console[f]); });
            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { expect(consoleStreams[f]).toBe(orig_console[f]); });
        });

        it('intercepting and restoring console multiple times should work', () => {
            expect.assertions(15);
            const orig_console: Record<string, (...args: unknown[]) => void> = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { orig_console[f] = consoleStreams[f]; });
            logger.interceptConsole();
            logger.interceptConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { expect(consoleStreams[f]).not.toBe(orig_console[f]); });

            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { expect(consoleStreams[f]).toBe(orig_console[f]); });
            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { expect(consoleStreams[f]).toBe(orig_console[f]); });
        });

        it('intercepting twice then restoring once should reset console', () => {
            expect.assertions(8);
            const orig_console: Record<string, (...args: unknown[]) => void> = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => { orig_console[f] = consoleStreams[f]; });

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
});
