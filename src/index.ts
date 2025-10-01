import _ from 'lodash';
import { inspect } from 'node:util';
import { Writable } from 'node:stream';
import winston from 'winston';
import { DateTime } from 'luxon';
import morgan from 'morgan';
import type http from 'node:http';
import type { InspectOptions } from 'node:util';

interface ExpressRequest extends http.IncomingMessage {
    route?: { path: string }
    user?:  { _id: string }
}

interface ExpressResponse extends http.ServerResponse {
    _header?: string
}

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
                    let formattedMessage: string;
                    if(message !== undefined && message !== null && _.isObject(message)) {
                        formattedMessage = JSON.stringify(message);
                    } else if(message !== undefined && message !== null) {
                        formattedMessage = _.isString(message) ? message : JSON.stringify(message);
                    } else {
                        formattedMessage = '';
                    }

                    if(level === noprefix) {
                        return _.trim(formattedMessage);
                    }

                    const messageStr = formattedMessage ? ' ' + formattedMessage : '';
                    const metaStr = meta && _.size(meta) ? ' ' + JSON.stringify(meta) : '';
                    return `[${timestamp ?? ''}] [${_.toUpper(level)}]${messageStr}${metaStr}`;
                })
            ),
        }),
    ],
}) as unknown as ExtendedLogger;

morgan.token('timestamp', LUXON_FORMAT_NOW);
morgan.token('route',     (req: http.IncomingMessage) => _.get(req as ExpressRequest, 'route.path', '***'));
morgan.token('user',      (req: http.IncomingMessage) => _.get(req as ExpressRequest, 'user._id')); // defaults to '-' even if you specify ''

morgan.format('mydev', function myDevFormatLine(
    tokens: morgan.TokenIndexer<http.IncomingMessage, http.ServerResponse>,
    req: http.IncomingMessage,
    res: http.ServerResponse
): string {
    const expressRes = res as ExpressResponse;
    const status: number | undefined = expressRes._header ? res.statusCode : undefined;

    // get status color
    let color: number;
    switch(true) {
        case (status !== undefined && status >= 500): color = 31; break;  // red
        case (status !== undefined && status >= 400): color = 33; break;  // yellow
        case (status !== undefined && status >= 300): color = 36; break;  // cyan
        default: color = 32;                      // green
    }

    // Build up format string for Morgan
    interface FormatLineWithCache {
        (tokens: morgan.TokenIndexer<http.IncomingMessage, http.ServerResponse>, req: http.IncomingMessage, res: http.ServerResponse): string
        [key: string]: morgan.FormatFn<http.IncomingMessage, http.ServerResponse> | undefined
    }
    const cachedFormatter = myDevFormatLine as FormatLineWithCache;
    let fn: morgan.FormatFn<http.IncomingMessage, http.ServerResponse> | undefined = cachedFormatter[`colorFormatter${color}`]; // Cache the format lines so we don't have to keep recompiling
    fn ??= cachedFormatter[`colorFormatter${color}`] = morgan.compile(`[:timestamp] \x1b[90m:method :url :route \x1b[${color}m:status \x1b[90m:response-time[5]ms :referrer \x1b[0m[:remote-addr] ~:user~`);

    return fn(tokens, req, res)!;
});

const replacement_console: Record<string, (...args: unknown[]) => void> = {};
interface LogMetadata {
    source?:       string
    stacktrace?:   string
    [key: string]: unknown
}

_.forEach(['log', 'info', 'warn', 'error'], (f) => {
    replacement_console[f] = function hideMe(...args: unknown[]) {
        const argsArray = Array.prototype.slice.call(args) as unknown[];
        const lastArg: unknown = _.last(argsArray);

        if(lastArg && _.isObject(lastArg) && (lastArg as LogMetadata).source === undefined) { // Set source to "console" if not already set to something else
            (lastArg as LogMetadata).source = 'console';
        } else if(!_.isObject(lastArg)) {
            argsArray.push({ source: 'console' });
        }

        const lastArgTyped = _.last(argsArray) as LogMetadata;

        if(f == 'error' && !lastArgTyped.stacktrace) {
            const stackTrace = { name: 'Stacktrace' } as { name: string, stack?: string };
            Error.captureStackTrace(stackTrace, hideMe);

            lastArgTyped.stacktrace = stackTrace.stack;
        }

        // Winston has no "log", just "info"
        interface LoggerWithMethods {
            info(...args: unknown[]): void
            warn(...args: unknown[]): void
            error(...args: unknown[]): void
        }
        const methodName = f == 'log' ? 'info' : f as 'info' | 'warn' | 'error';
        return (logger as unknown as LoggerWithMethods)[methodName].apply(logger, argsArray);
    };
});
replacement_console.dir = function(obj: unknown, options?: unknown) {
    logger.info(inspect(obj, options as InspectOptions), { source: 'console' });
};

logger.restoreConsole = function(): void {
    _.assign(console, orig_console);
};

logger.interceptConsole = function(): void {
    _.assign(console, replacement_console);
};

logger.morganStream = new Writable({
    write(chunk, _encoding, callback) {
        const message = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        logger.log({ level: noprefix, message });
        callback();
    }
});
// Stryker disable next-line ObjectLiteral: By default morgan will hook up to a stream that does the same thing
export const middleware = morgan('mydev', { stream: logger.morganStream });
export { logger, noprefix };
