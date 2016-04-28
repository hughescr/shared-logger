'use strict';

if(global.logger) { return; } // Don't double-load

const util               = require('util');
const winston            = require('winston');
const moment             = require('moment');
const morgan             = require('morgan');

const MOMENT_FORMAT      = 'YYYY-MM-DD HH:mm:ss.SSS ZZ';

function MOMENT_FORMAT_NOW()
{
    return moment().utc().format(MOMENT_FORMAT);
}

const logger = new winston.Logger({
    levels:
    {
        noprefix: 0,
        info: 1,
        warn: 2,
        error: 3,
        debug: 4,
    },
    level: 'debug',
});

logger.add(winston.transports.Console,
{
    timestamp: MOMENT_FORMAT_NOW,
    humanReadableUnhandledException: true,
    level: 'debug',
    formatter: function(options)
    {
        if(options.level == 'noprefix')
        {
            return options.message;
        }

        return `[${options.timestamp()}] [${options.level.toUpperCase()}]${options.message ? ' ' + options.message : ''}${options.meta && Object.keys(options.meta).length ? ' ' + JSON.stringify(options.meta) : ''}`;
    },
});

morgan.token('timestamp', MOMENT_FORMAT_NOW);
morgan.token('route',     function(req) { return req.route && req.route.path || '***'; });
morgan.token('user',      function(req) { return req.user  && req.user._id   || '-'; });

morgan.format('mydev', function myDevFormatLine(tokens, req, res)
{
    let status = res._header ? res.statusCode : undefined;

    // get status color
    let color = 32; // green

    if(status >= 500) { color = 31; } // red
    else if(status >= 400) { color = 33; } // yellow
    else if(status >= 300) { color = 36; } // cyan

    // Build up format string for Morgan
    let fn = myDevFormatLine[color]; // Cache the format lines so we don't have to keep recompiling
    if(!fn)
    {
        // compile
        fn = myDevFormatLine[color] = morgan.compile('[:timestamp] \x1b[90m:method :url :route \x1b[' + color + 'm:status \x1b[90m:response-time[5]ms :referrer \x1b[0m[:remote-addr] ~:user~');
    }

    return fn(tokens, req, res);
});

let orig_console = {};
['log', 'info', 'warn', 'error', 'dir'].forEach(function(f) { orig_console[f] = console[f]; });

let replacement_console = {};
['log', 'info', 'warn', 'error'].forEach(function(f)
{
    replacement_console[f] = function hideMe()
    {
        let args = Array.prototype.slice.call(arguments);
        if(args.length > 0 && args[args.length - 1] instanceof Object && !args[args.length - 1].source) // Set source to "console" if not already set to something else
        {
            args[args.length - 1].source = 'console';
        }
        else if(!(args[args.length - 1] instanceof Object && args[args.length - 1].source))
        {
            args.push({ source: 'console' });
        }

        if(f == 'error' && !args[args.length - 1].stacktrace) // If this is an error, attach a stacktrace
        {
            let stackTrace = { name: 'Stacktrace' };
            Error.captureStackTrace(stackTrace, hideMe);
            args[args.length - 1].stacktrace = stackTrace.stack;
        }

        // Winston has no "log", just "info"
        return logger[f == 'log' ? 'info' : f].apply(logger, args);
    };
});
replacement_console.dir = function(obj, options)
{
    logger.info(util.inspect(obj, options), { source: 'console' });
};

logger.restoreConsole = function()
{
    if(console.__intercepted__)
    {
        Object.assign(console, orig_console);
        delete console.__intercepted__;
    }
};

logger.interceptConsole = function()
{
    if(!console.__intercepted__)
    {
        Object.assign(console, replacement_console);
        console.__intercepted__ = true;
    }
};

logger.interceptConsole();

global.logger = logger;

logger.stream = { write: function(msg) { logger.log('noprefix', msg); } };
module.exports = morgan('mydev', { stream: logger.stream });
