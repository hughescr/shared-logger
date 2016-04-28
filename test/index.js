'use strict';

const expressLogger = require('../src');
const chai = require('chai');
const expect = chai.expect;

const http = require('http');
const request = require('supertest');

logger.restoreConsole();

describe('Logging', function()
{
    describe('Basic logger', function()
    {
        it('should provide a global "logger" object', function()
        {
            expect(global.logger).to.be.instanceof(Object);
        });

        describe('Methods', function()
        {
            ['info', 'warn', 'error', 'debug'].forEach(function(level)
            {
                it(`logger should have a method for logging at level ${level}`, function()
                {
                    expect(global.logger).to.have.property(level)
                        .which.is.an.instanceof(Function);
                });

                it(`logging at level ${level} should have proper format`, function()
                {
                    let hook = captureStream((level != 'error' && level != 'debug') ? process.stdout : process.stderr);
                    logger[level]('hi');
                    hook.unhook();

                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3} \\+0000\\] \\[${level.toLocaleUpperCase()}\\] hi\\n$`));
                });
            });
        });

        it('logging should allow passing an object', function()
        {
            let hook = captureStream(process.stdout);
            logger.info('hi', { some: 'object' });
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO\] hi \{"some":"object"\}\n$/);
        });

        it('logging should allow empty message', function()
        {
            let hook = captureStream(process.stdout);
            logger.info();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO\]\n$/);
        });

        it('logging should message with just object', function()
        {
            let hook = captureStream(process.stdout);
            logger.info({ some: 'object' });
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO\] \{"some":"object"\}\n$/);
        });
    });

    describe('Console', function()
    {
        it('logger should be able to interceptConsole', function()
        {
            expect(global.logger).to.have.property('interceptConsole')
                .which.is.an.instanceof(Function);
        });

        it('logger should be able to restoreConsole', function()
        {
            expect(global.logger).to.have.property('restoreConsole')
                .which.is.an.instanceof(Function);
        });

        it('intercepting and restoring console should work', function()
        {
            const orig_log = console.log;
            logger.interceptConsole();
            expect(console.__intercepted__).to.equal(true);
            expect(console.log).to.not.equal(orig_log);
            logger.restoreConsole();
            expect(console.__intercepted__).to.equal(undefined);
            expect(console.log).to.equal(orig_log);
        });

        it('intercepting and restoring console multiple times should work', function()
        {
            const orig_log = console.log;
            logger.interceptConsole();
            expect(console.__intercepted__).to.equal(true);
            expect(console.log).to.not.equal(orig_log);
            logger.interceptConsole();
            expect(console.__intercepted__).to.equal(true);
            expect(console.log).to.not.equal(orig_log);

            logger.restoreConsole();
            expect(console.__intercepted__).to.equal(undefined);
            expect(console.log).to.equal(orig_log);
            logger.restoreConsole();
            expect(console.__intercepted__).to.equal(undefined);
            expect(console.log).to.equal(orig_log);
        });

        describe('Methods', function()
        {
            ['log', 'info', 'warn'].forEach(function(level)
            {
                it(`Check level ${level} on console`, function()
                {
                    let hook = captureStream(process.stdout);
                    logger.interceptConsole();
                    console[level]('hi');
                    logger.restoreConsole();
                    hook.unhook();

                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3} \\+0000\\] \\[${level.replace('log', 'info').toLocaleUpperCase()}\\] hi \\{"source":"console"\\}\\n$`));
                });
            });

            it('Check level error on console', function()
            {
                let hook = captureStream(process.stderr);
                logger.interceptConsole();
                console.error('hi');
                logger.restoreConsole();
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3} \\+0000\\] \\[ERROR\\] hi \\{"source":"console","stacktrace":"Stacktrace[^)]*/test/index.js:[^}]*\\}\\n$'));
            });

            it('Check dir helper on console', function()
            {
                let hook = captureStream(process.stdout);
                logger.interceptConsole();
                console.dir({ some: 'object' });
                logger.restoreConsole();
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3} \\+0000\\] \\[INFO\\] \\{ some: \\\'object\\\' \\} \\{"source":"console"}\\n$'));
            });
        });

        it('console logging an empty message should work', function()
        {
            let hook = captureStream(process.stdout);
            logger.interceptConsole();
            console.log();
            logger.restoreConsole();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO\] \{"source":"console"\}\n$/);
        });

        it('console logging overriding source should work', function()
        {
            let hook = captureStream(process.stdout);
            logger.interceptConsole();
            console.log('hi', { source: 'other' });
            logger.restoreConsole();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO\] hi \{"source":"other"\}\n$/);
        });

        it('console logging an object should work', function()
        {
            let hook = captureStream(process.stdout);
            logger.interceptConsole();
            console.log('hi', { some: 'object' });
            logger.restoreConsole();
            hook.unhook();

            expect(hook.captured()).to.match(/\[INFO\] hi \{"some":"object","source":"console"\}\n$/);
        });
    });

    describe('Express', function()
    {
        it('should provide a logging middleware for express', function()
        {
            expect(expressLogger).to.be.instanceof(Function);
        });

        it('express middleware should log things', function(done)
        {
            let hook = captureStream(process.stdout);

            request(http.createServer(function(req, res)
            {
                return expressLogger(req, res, function onNext()
                {
                    res.end('OK');
                });
            }))
            .get('/some/path')
            .set('Referrer', 'http://example.com/some/referrer')
            .expect(function()
            {
                hook.unhook();

                expect(hook.captured()).to.match(new RegExp('^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3} \\+0000\\] \\S*GET /some/path \\*\\*\\* [^ ]*32m200 \\S*[0-9.]+ms http://example.com/some/referrer \\S*\\[[^\\]]*\\] ~-~\\n\\n$'));
            })
            .end(done);
        });

        [
            [ 200, 32 ],
            [ 300, 36 ],
            [ 400, 33 ],
            [ 500, 31 ],
        ].forEach(function(status_color)
        {
            it(`express middleware should colorize status ${status_color[0]} properly`, function(done)
            {
                let hook = captureStream(process.stdout);

                request(http.createServer(function(req, res)
                {
                    return expressLogger(req, res, function onNext()
                    {
                        res.writeHead(status_color[0]);
                        res.end();
                    });
                }))
                .get('/some/path')
                .set('Referrer', 'http://example.com/some/referrer')
                .expect(function()
                {
                    hook.unhook();

                    expect(hook.captured()).to.match(new RegExp(`^\\[\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3} \\+0000\\] \\S*GET /some/path \\*\\*\\* [^ ]*${status_color[1]}m${status_color[0]} \\S*[0-9.]+ms http://example.com/some/referrer \\S*\\[[^\\]]*\\] ~-~\\n\\n$`));
                })
                .end(done);
            });
        });
    });
});

function captureStream(stream)
{
    let oldWrite = stream.write;
    let buf = '';
    stream.write = function(chunk)
    {
        buf += chunk.toString(); // chunk is a String or Buffer
    };

    return {
        unhook: function unhook()
        {
            stream.write = oldWrite;
        },

        captured: function()
        {
            return buf;
        },
    };
}
