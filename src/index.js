'use strict';

const util               = require('util');
const winston            = require('winston');
const moment             = require('moment');
const morgan             = require('morgan');

const MOMENT_FORMAT      = 'YYYY-MM-DD HH:mm:ss.SSS ZZ';

function MOMENT_FORMAT_NOW() {
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
    formatter: function(options) {
        if(options.level == 'noprefix') {
            return options.message;
        }

        return `[${options.timestamp()}] [${options.level.toUpperCase()}]${options.message ? ' ' + options.message : ''}${options.meta && Object.keys(options.meta).length ? ' ' + JSON.stringify(options.meta) : ''}`;
    },
});

morgan.token('timestamp', MOMENT_FORMAT_NOW);
morgan.token('route',     req => req.route && req.route.path || '***');
morgan.token('user',      req => req.user  && req.user._id   || '-');

morgan.format('mydev', function myDevFormatLine(tokens, req, res) {
    const status = res._header ? res.statusCode : undefined;

    // get status color
    let color;
    switch (true) {
        case (status >= 500): color = 31; break;  // red
        case (status >= 400): color = 33; break;  // yellow
        case (status >= 300): color = 36; break;  // cyan
        default: color = 32;                      // green
    }

    // Build up format string for Morgan
    let fn = myDevFormatLine[color]; // Cache the format lines so we don't have to keep recompiling
    if(!fn) {
        // compile
        fn = myDevFormatLine[color] = morgan.compile('[:timestamp] \x1b[90m:method :url :route \x1b[' + color + 'm:status \x1b[90m:response-time[5]ms :referrer \x1b[0m[:remote-addr] ~:user~');
    }

    return fn(tokens, req, res);
});

const orig_console = {};
['log', 'info', 'warn', 'error', 'dir'].forEach(f => { orig_console[f] = console[f]; });

const replacement_console = {};
['log', 'info', 'warn', 'error'].forEach(f => {
    replacement_console[f] = function hideMe() {
        const args = Array.prototype.slice.call(arguments);
        if(args.length > 0 && args[args.length - 1] instanceof Object && !args[args.length - 1].source) { // Set source to "console" if not already set to something else
            args[args.length - 1].source = 'console';
        } else if(!(args[args.length - 1] instanceof Object && args[args.length - 1].source)) {
            args.push({ source: 'console' });
        }

        if(f == 'error' && !args[args.length - 1].stacktrace) { // If this is an error, attach a stacktrace
            const stackTrace = { name: 'Stacktrace' };
            Error.captureStackTrace(stackTrace, hideMe);
            args[args.length - 1].stacktrace = stackTrace.stack;
        }

        // Winston has no "log", just "info"
        return logger[f == 'log' ? 'info' : f].apply(logger, args);
    };
});
replacement_console.dir = function(obj, options) {
    logger.info(util.inspect(obj, options), { source: 'console' });
};

logger.restoreConsole = function() {
    if(console.__intercepted__) {
        Object.assign(console, orig_console);
        delete console.__intercepted__;
    }
};

logger.interceptConsole = function() {
    if(!console.__intercepted__) {
        Object.assign(console, replacement_console);
        console.__intercepted__ = true;
    }
};

logger.stream = { write: function(msg) { logger.log('noprefix', msg.trim()); } };
module.exports.middleware = morgan('mydev', { stream: logger.stream });
module.exports.logger = logger;
