'use strict';

const loggers       = require('../src');
const logger        = loggers.logger;
const expressLogger = loggers.middleware;
const loggerStream  = logger.morganStream;

const http          = require('http');
const request       = require('supertest');

const morgan        = require('morgan');

const _             = require('lodash');

const myTestPath = module.filename.slice(module.filename.lastIndexOf(require('path').sep, module.filename.lastIndexOf(require('path').sep) - 1) + 1, module.filename.length);

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

            _.forEach(['info', 'warn', 'error', 'debug'], level => {
                it(`logger should have a method for logging at level ${level}`, () => {
                    expect.assertions(1);
                    expect(logger).toHaveProperty(level, expect.any(Function));
                });

                it(`logging at level ${level} should have proper format`, () => {
                    expect.assertions(1);
                    const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
                    logger[level]('hi');

                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${level.toLocaleUpperCase()}\\] hi\\n$`)));
                });
            });
        });

        it('logging should allow passing an object', () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
            logger.info('hi', { some: 'object' });

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hi \{"some":"object"\}\n$/));
        });

        it('logging should allow empty message', () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
            logger.info();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\]\n$/));
        });

        it('logging should message with just object', () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
            logger.info({ some: 'object' });

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
            const orig_console = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { orig_console[f] = console[f]; });
            logger.interceptConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { expect(console[f]).not.toBe(orig_console[f]); });
            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { expect(console[f]).toBe(orig_console[f]); });
        });

        it('intercepting and restoring console multiple times should work', () => {
            expect.assertions(15);
            const orig_console = {};
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { orig_console[f] = console[f]; });
            logger.interceptConsole();
            logger.interceptConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { expect(console[f]).not.toBe(orig_console[f]); });

            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { expect(console[f]).toBe(orig_console[f]); });
            logger.restoreConsole();
            _.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { expect(console[f]).toBe(orig_console[f]); });
        });

        describe('Methods', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            _.forEach(['log', 'info', 'warn'], level => {
                it(`Check level ${level} on console with no arg`, () => {
                    expect.assertions(1);
                    const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
                    logger.interceptConsole();
                    console[level]();
                    logger.restoreConsole();
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${_.toUpper(_.replace(level, 'log', 'info'))}\\] \\{"source":"console"\\}\\n$`)));
                });

                it(`Check level ${level} on console`, () => {
                    expect.assertions(1);
                    const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
                    logger.interceptConsole();
                    console[level]('hi');
                    logger.restoreConsole();
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${_.toUpper(_.replace(level, 'log', 'info'))}\\] hi \\{"source":"console"\\}\\n$`)));
                });
            });

            it('Check level error on console with no arg', () => {
                expect.assertions(1);
                const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
                logger.interceptConsole();
                console.error();
                logger.restoreConsole();

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[ERROR\\] \\{"source":"console","stacktrace":"Stacktrace[^)]*${myTestPath}:[^}]*\\}\n$`)));
            });

            it('Check level error on console', () => {
                expect.assertions(1);
                const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
                logger.interceptConsole();
                console.error('hi');
                logger.restoreConsole();

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[ERROR\\] hi \\{"source":"console","stacktrace":"Stacktrace[^)]*${myTestPath}:[^}]*\\}\n$`)));
            });

            it('Check dir helper on console', () => {
                expect.assertions(1);
                const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
                logger.interceptConsole();
                console.dir({ some: 'object' });
                logger.restoreConsole();

                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \[INFO\] \{ some: 'object' \} \{"source":"console"\}\n$/));
            });
        });

        it('console logging an empty message should work', () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
            logger.interceptConsole();
            console.log();
            logger.restoreConsole();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] \{"source":"console"\}\n$/));
        });

        it('console logging overriding source should work', () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
            logger.interceptConsole();
            console.log('hi', { source: 'other' });
            logger.restoreConsole();

            expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] hi \{"source":"other"\}\n$/));
        });

        it('console logging an object should work', () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
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
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);

            return request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    res.end('OK');
                });
            }))
            .get('/some/path')
            .set('Referrer', 'http://example.com/some/referrer')
            .expect(() => {
                expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \S*GET \/some\/path \*\*\* [^ ]*32m200 \S*[\d.]ms http:\/\/example.com\/some\/referrer [^[]*\[[^\]]*\] ~-~\n$/));
            });
        });

        it('express middleware should create color formatter which is re-used', async () => {
            expect.assertions(6);
            jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);
            let origFormatter;

            return request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    res.end('OK');
                });
            }))
            .get('/some/path')
            .expect(() => {
                expect(morgan).toHaveProperty('mydev');
                expect(morgan.mydev).toHaveProperty('colorFormatter32');
                expect(morgan.mydev.colorFormatter32).toBeInstanceOf(Function);
                origFormatter = morgan.mydev.colorFormatter32;
            })
            .then(() => {
                return request(http.createServer((req, res) => {
                    return expressLogger(req, res, function onNext() {
                        res.end('OK');
                    });
                }))
                .get('/some/path')
                .expect(() => {
                    expect(morgan).toHaveProperty('mydev');
                    expect(morgan.mydev).toHaveProperty('colorFormatter32');
                    expect(morgan.mydev.colorFormatter32).toBe(origFormatter);
                });
            });
        });

        it('express middleware should handle request details', async () => {
            expect.assertions(1);
            const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);

            return request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    req.user = { _id: 'fake_user_id' };
                    req.route = { path: '/some/fake/route/path' };
                    res.end('OK');
                });
            }))
                .get('/some/path')
                .set('Referrer', 'http://example.com/some/referrer')
                .expect(() => {
                    expect(spyOnStream).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+0000|Z)\] \S*GET \/some\/path \/some\/fake\/route\/path [^ ]*32m200 \S*[\d.]ms http:\/\/example.com\/some\/referrer [^[]*\[[^\]]*\] ~fake_user_id~\n$/));
                });
        });

        test.todo('express middleware should handle case of logging where there is no res._header');

        _.forEach([
            [200, 32],
            [300, 36],
            [400, 33],
            [500, 31],
        ], status_color => {
            it(`express middleware should colorize status ${status_color[0]} properly`, async () => {
                expect.assertions(2);
                const spyOnStream = jest.spyOn(process.stdout, 'write').mockImplementation(_.noop);

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
                    expect(morgan.mydev).toHaveProperty(`colorFormatter${status_color[1]}`, expect.any(Function));
                });
            });
        });
    });
});
