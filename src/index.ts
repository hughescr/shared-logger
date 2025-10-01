import _ from 'lodash';
import { inspect } from 'node:util';
import { Writable } from 'node:stream';
import winston from 'winston';
import { DateTime } from 'luxon';
import morgan from 'morgan';
import type http from 'node:http';

interface ExtendedLogger extends winston.Logger {
    restoreConsole:   () => void
    interceptConsole: () => void
    morganStream:     Writable
}

const orig_console: Record<string, (...args: unknown[]) => void> = {};
_.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
    orig_console[f] = (console as unknown as Record<string, (...args: unknown[]) => void>)[f];
});

function LUXON_FORMAT_NOW(): string {
    return DateTime.utc().toISO();
}

const noprefix = 'noprefix';

const logger: ExtendedLogger = winston.createLogger({
    levels: {
        error:      0,
        warn:       1,
        info:       2,
        [noprefix]: 2,
        debug:      3,
    },
    level:      'debug',
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error', 'debug'],
            format:       winston.format.combine(
                winston.format.timestamp(),
                winston.format.splat(),
                winston.format.printf(({ timestamp, level, message, ...meta }: { timestamp?: string, level: string, message?: unknown, [key: string]: unknown }) => {
                    if(message instanceof Object) {
                        message = JSON.stringify(message); // eslint-disable-line no-param-reassign -- I have to over-ride message here
                    }
                    if(level === noprefix) {
                        return _.trim(String(message));
                    }

                    return `[${timestamp}] [${_.toUpper(level)}]${message ? ' ' + String(message) : ''}${meta && _.size(meta) ? ' ' + JSON.stringify(meta) : ''}`;
                })
            ),
        }),
    ],
}) as unknown as ExtendedLogger;

morgan.token('timestamp', LUXON_FORMAT_NOW);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- req from express
morgan.token('route',     (req: any) => _.get(req, 'route.path', '***'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- req from express
morgan.token('user',      (req: any) => _.get(req, 'user._id')); // defaults to '-' even if you specify ''

morgan.format('mydev', function myDevFormatLine(
    tokens: morgan.TokenIndexer<http.IncomingMessage, http.ServerResponse>,
    req: http.IncomingMessage,
    res: http.ServerResponse
): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing internal property
    const status: number | undefined = (res as any)._header ? res.statusCode : undefined;

    // get status color
    let color: number;
    switch(true) {
        case (status !== undefined && status >= 500): color = 31; break;  // red
        case (status !== undefined && status >= 400): color = 33; break;  // yellow
        case (status !== undefined && status >= 300): color = 36; break;  // cyan
        default: color = 32;                      // green
    }

    // Build up format string for Morgan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic property storage
    let fn: morgan.FormatFn<any, any> | undefined = (myDevFormatLine as any)[`colorFormatter${color}`]; // Cache the format lines so we don't have to keep recompiling
    if(!fn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic property storage
        fn = (myDevFormatLine as any)[`colorFormatter${color}`] = morgan.compile(`[:timestamp] \x1b[90m:method :url :route \x1b[${color}m:status \x1b[90m:response-time[5]ms :referrer \x1b[0m[:remote-addr] ~:user~`);
    }

    return fn(tokens, req, res)!;
});

const replacement_console: Record<string, (...args: unknown[]) => void> = {};
_.forEach(['log', 'info', 'warn', 'error'], (f) => {
    replacement_console[f] = function hideMe(...args: unknown[]) {
        const argsArray = Array.prototype.slice.call(args) as unknown[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown object structure
        let lastArg: any = _.last(argsArray);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- augmenting argument
        if(lastArg && _.isObject(lastArg) && (lastArg as any).source === undefined) { // Set source to "console" if not already set to something else
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- augmenting argument
            (lastArg as any).source = 'console';
        } else if(!_.isObject(lastArg)) {
            argsArray.push({ source: 'console' });
        }

        lastArg = _.last(argsArray);

        if(f == 'error' && !(lastArg).stacktrace) {
            const stackTrace = { name: 'Stacktrace' } as { name: string, stack?: string };
            Error.captureStackTrace(stackTrace, hideMe);

            (lastArg).stacktrace = stackTrace.stack;
        }

        // Winston has no "log", just "info"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic call into logger
        return (logger as any)[f == 'log' ? 'info' : f].apply(logger, argsArray);
    };
});
replacement_console.dir = function(obj: unknown, options?: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- inspect options are untyped
    logger.info(inspect(obj, options as any), { source: 'console' });
};

logger.restoreConsole = function(): void {
    _.assign(console, orig_console);
};

logger.interceptConsole = function(): void {
    _.assign(console, replacement_console);
};

logger.morganStream = new Writable({
    write(chunk, encoding, callback) {
        logger.log({ level: noprefix, message: chunk.toString('utf8') });
        callback();
    }
});
// Stryker disable next-line ObjectLiteral: By default morgan will hook up to a stream that does the same thing
export const middleware = morgan('mydev', { stream: logger.morganStream });
export { logger, noprefix };
