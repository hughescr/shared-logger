'use strict';

const loggers       = require('../src');
const logger        = loggers.logger;
const expressLogger = loggers.middleware;
const chai          = require('chai');
const expect        = chai.expect;

const http          = require('http');
const request       = require('supertest');

const morgan        = require('morgan');

describe('Logging', () => {
    describe('Basic logger', () => {
        it('should provide a "logger" and "middleware"', () => {
            expect(loggers.logger).to.be.instanceof(Object);
            expect(loggers.middleware).to.be.instanceof(Object);
            expect(loggers.logger.level).to.be.equal('debug');
        });

        it('morgan should have some things defined', () => {
            expect(morgan).to.have.property('timestamp').which.is.instanceof(Function);
            expect(morgan).to.have.property('route').which.is.instanceof(Function);
            expect(morgan).to.have.property('user').which.is.instanceof(Function);
            expect(morgan).to.have.property('mydev').which.is.instanceof(Function);
        });

        describe('Methods', () => {
            ['info', 'warn', 'error', 'debug'].forEach(level => {
                it(`logger should have a method for logging at level ${level}`, () => {
                    expect(logger).to.have.property(level)
                        .which.is.an.instanceof(Function);
                });

                it(`logging at level ${level} should have proper format`, () => {
                    const hook = captureStream((level != 'error' && level != 'debug') ? process.stdout : process.stderr);
                    logger[level]('hi');
                    hook.unhook();

                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${level.toLocaleUpperCase()}\\] hi\\n$`));
                });
            });
        });

        it('logging should allow passing an object', () => {
            const hook = captureStream(process.stdout);
            logger.info('hi', { some: 'object' });
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO] hi \{"some":"object"\}\n$/);
        });

        it('logging should allow empty message', () => {
            const hook = captureStream(process.stdout);
            logger.info();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO]\n$/);
        });

        it('logging should message with just object', () => {
            const hook = captureStream(process.stdout);
            logger.info({ some: 'object' });
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO] \{"some":"object"\}\n$/);
        });
    });

    describe('Console', () => {
        it('logger should be able to interceptConsole', () => {
            expect(logger).to.have.property('interceptConsole')
                .which.is.an.instanceof(Function);
        });

        it('logger should be able to restoreConsole', () => {
            expect(logger).to.have.property('restoreConsole')
                .which.is.an.instanceof(Function);
        });

        it('intercepting and restoring console should work', () => {
            const orig_console = {};
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { orig_console[f] = console[f]; });
            logger.interceptConsole();
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { expect(console[f]).to.not.equal(orig_console[f]); });
            logger.restoreConsole();
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { expect(console[f]).to.equal(orig_console[f]); });
        });

        it('intercepting and restoring console multiple times should work', () => {
            const orig_console = {};
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { orig_console[f] = console[f]; });
            logger.interceptConsole();
            logger.interceptConsole();
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { expect(console[f]).to.not.equal(orig_console[f]); });

            logger.restoreConsole();
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { expect(console[f]).to.equal(orig_console[f]); });
            logger.restoreConsole();
            ['log', 'info', 'warn', 'error', 'dir'].forEach(f => { expect(console[f]).to.equal(orig_console[f]); });
        });

        describe('Methods', () => {
            ['log', 'info', 'warn'].forEach(level => {
                it(`Check level ${level} on console with no arg`, () => {
                    const hook = captureStream(process.stdout);
                    logger.interceptConsole();
                    console[level]();
                    logger.restoreConsole();
                    hook.unhook();
                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${level.replace('log', 'info').toLocaleUpperCase()}\\] \\{"source":"console"\\}\\n$`));
                });

                it(`Check level ${level} on console`, () => {
                    const hook = captureStream(process.stdout);
                    logger.interceptConsole();
                    console[level]('hi');
                    logger.restoreConsole();
                    hook.unhook();
                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[${level.replace('log', 'info').toLocaleUpperCase()}\\] hi \\{"source":"console"\\}\\n$`));
                });
            });

            it('Check level error on console with no arg', () => {
                const hook = captureStream(process.stderr);
                logger.interceptConsole();
                console.error();
                logger.restoreConsole();
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[ERROR\\] \\{"source":"console","stacktrace":"Stacktrace[^)]*/test/index.js:[^}]*\\}\\n$'));
            });

            it('Check level error on console', () => {
                const hook = captureStream(process.stderr);
                logger.interceptConsole();
                console.error('hi');
                logger.restoreConsole();
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[ERROR\\] hi \\{"source":"console","stacktrace":"Stacktrace[^)]*/test/index.js:[^}]*\\}\\n$'));
            });

            it('Check dir helper on console', () => {
                const hook = captureStream(process.stdout);
                logger.interceptConsole();
                console.dir({ some: 'object' });
                logger.restoreConsole();
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\[INFO\\] \\{ some: \\\'object\\\' \\} \\{"source":"console"}\\n$'));
            });
        });

        it('console logging an empty message should work', () => {
            const hook = captureStream(process.stdout);
            logger.interceptConsole();
            console.log();
            logger.restoreConsole();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO] \{"source":"console"\}\n$/);
        });

        it('console logging overriding source should work', () => {
            const hook = captureStream(process.stdout);
            logger.interceptConsole();
            console.log('hi', { source: 'other' });
            logger.restoreConsole();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO] hi \{"source":"other"\}\n$/);
        });

        it('console logging an object should work', () => {
            const hook = captureStream(process.stdout);
            logger.interceptConsole();
            console.log('hi', { some: 'object' });
            logger.restoreConsole();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO] hi \{"some":"object","source":"console"\}\n$/);
        });
    });

    describe('Express', () => {
        it('should provide a logging middleware for express', () => {
            expect(expressLogger).to.be.instanceof(Function);
        });

        it('express middleware should log things', done => {
            const hook = captureStream(process.stdout);

            request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    res.end('OK');
                });
            }))
            .get('/some/path')
            .set('Referrer', 'http://example.com/some/referrer')
            .expect(() => {
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\S*GET /some/path \\*\\*\\* [^ ]*32m200 \\S*[0-9.]+ms http://example.com/some/referrer \\S*\\[[^\\]]*\\] ~-~\\n$'));
            })
            .end(done);
        });

        it('express middleware should create color formatter which is re-used', done => {
            const hook = captureStream(process.stdout);
            let origFormatter;

            request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    res.end('OK');
                });
            }))
            .get('/some/path')
            .expect(() => {
                expect(morgan).to.have.property('mydev').which.has.property('colorFormatter32').which.is.instanceof(Function);
                origFormatter = morgan.mydev.colorFormatter32;
            })
            .end(() => {
                request(http.createServer((req, res) => {
                    return expressLogger(req, res, function onNext() {
                        res.end('OK');
                    });
                }))
                .get('/some/path')
                .expect(() => {
                    hook.unhook();
                    expect(morgan).to.have.property('mydev').which.has.property('colorFormatter32').which.equals(origFormatter);
                })
                .end(done);
            });
        });

        it('express middleware should handle request details', done => {
            const hook = captureStream(process.stdout);

            request(http.createServer((req, res) => {
                return expressLogger(req, res, function onNext() {
                    req.user = { _id: 'fake_user_id' };
                    req.route = { path: '/some/fake/route/path' };
                    res.end('OK');
                });
            }))
            .get('/some/path')
            .set('Referrer', 'http://example.com/some/referrer')
            .expect(() => {
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\S*GET /some/path /some/fake/route/path [^ ]*32m200 \\S*[0-9.]+ms http://example.com/some/referrer \\S*\\[[^\\]]*\\] ~fake_user_id~\\n$'));
            })
            .end(done);
        });

        it('express middleware should handle case of logging where there is no res._header');

        [
            [200, 32],
            [300, 36],
            [400, 33],
            [500, 31],
        ].forEach(status_color => {
            it(`express middleware should colorize status ${status_color[0]} properly`, done => {
                const hook = captureStream(process.stdout);

                request(http.createServer((req, res) => {
                    return expressLogger(req, res, function onNext() {
                        res.writeHead(status_color[0]);
                        res.end();
                    });
                }))
                .get('/some/path')
                .set('Referrer', 'http://example.com/some/referrer')
                .expect(() => {
                    hook.unhook();

                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}(\\+0000|Z)\\] \\S*GET /some/path \\*\\*\\* [^ ]*${status_color[1]}m${status_color[0]} \\S*[0-9.]+ms http://example.com/some/referrer \\S*\\[[^\\]]*\\] ~-~\\n$`));
                })
                .end(done);
            });
        });
    });
});

function captureStream(stream) {
    const oldWrite = stream.write;
    let buf = '';
    stream.write = function(chunk) {
        buf += chunk.toString(); // chunk is a String or Buffer
    };

    return {
        unhook: function unhook() {
            stream.write = oldWrite;
        },

        captured: function() {
            return buf;
        },
    };
}
