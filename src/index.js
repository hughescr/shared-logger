'use strict';

const _                  = require('lodash');

const orig_console = {};
_.forEach(['log', 'info', 'warn', 'error', 'dir'], f => { orig_console[f] = console[f]; });

const util               = require('util');
const winston            = require('winston');
const { DateTime }             = require('luxon');
const morgan             = require('morgan');

function LUXON_FORMAT_NOW() {
    return DateTime.utc().toISO();
}

const noprefix = 'noprefix';

const logger = winston.createLogger({
    levels: {
        [noprefix]: 0,
        info: 1,
        warn: 2,
        error: 3,
        debug: 4,
    },
    level: 'debug',
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error', 'debug'],
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.splat(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    if(message instanceof Object) {
                        message = JSON.stringify(message); // eslint-disable-line no-param-reassign -- I have to over-ride message here
                    }
                    if(level === noprefix) {
                        return _.trim(message);
                    }

                    return `[${timestamp}] [${_.toUpper(level)}]${message ? ' ' + message : ''}${meta && _.size(meta) ? ' ' + JSON.stringify(meta) : ''}`;
                })
            ),
        }),
    ],
});

morgan.token('timestamp', LUXON_FORMAT_NOW);
morgan.token('route',     req => _.get(req, 'route.path', '***'));
morgan.token('user',      req => _.get(req, 'user._id', '-'));

morgan.format('mydev', function myDevFormatLine(tokens, req, res) {
    const status = res._header ? res.statusCode : undefined;

    // get status color
    let color;
    switch(true) {
        case (status >= 500): color = 31; break;  // red
        case (status >= 400): color = 33; break;  // yellow
        case (status >= 300): color = 36; break;  // cyan
        default: color = 32;                      // green
    }

    // Build up format string for Morgan
    let fn = myDevFormatLine[`colorFormatter${color}`]; // Cache the format lines so we don't have to keep recompiling
    if(!fn) {
        fn = myDevFormatLine[`colorFormatter${color}`] = morgan.compile(`[:timestamp] \x1b[90m:method :url :route \x1b[${color}m:status \x1b[90m:response-time[5]ms :referrer \x1b[0m[:remote-addr] ~:user~`);
    }

    return fn(tokens, req, res);
});

const replacement_console = {};
_.forEach(['log', 'info', 'warn', 'error'], f => {
    replacement_console[f] = function hideMe() {
        const args = Array.prototype.slice.call(arguments);
        let lastArg = _.last(args);
        if(lastArg && _.isObject(lastArg) && lastArg.source === undefined) { // Set source to "console" if not already set to something else
            lastArg.source = 'console';
        } else if(!_.isObject(lastArg)) {
            args.push({ source: 'console' });
        }

        lastArg = _.last(args);
        if(f == 'error' && !lastArg.stacktrace) { // If this is an error, attach a stacktrace
            const stackTrace = { name: 'Stacktrace' };
            Error.captureStackTrace(stackTrace, hideMe);
            lastArg.stacktrace = stackTrace.stack;
        }

        // Winston has no "log", just "info"
        return logger[f == 'log' ? 'info' : f].apply(logger, args);
    };
});
replacement_console.dir = function(obj, options) {
    logger.info(util.inspect(obj, options), { source: 'console' });
};

logger.restoreConsole = function() {
    _.assign(console, orig_console);
};

logger.interceptConsole = function() {
    _.assign(console, replacement_console);
};

logger.stream = { write: function(msg) { logger.log(noprefix, msg); } };
module.exports.middleware = morgan('mydev', { stream: logger.stream });
module.exports.logger = logger;
module.exports.noprefix = noprefix;
