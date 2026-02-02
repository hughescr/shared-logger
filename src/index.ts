import _ from 'lodash';
import { inspect } from 'node:util';
import { Writable } from 'node:stream';
import winston from 'winston';
import { DateTime } from 'luxon';
import morgan from 'morgan';
import type http from 'node:http';
import type { InspectOptions } from 'node:util';

// ANSI color codes for terminal output
const ANSI = {
    codes: {
        RED:    31,  // Error (5xx)
        GREEN:  32,  // Success (2xx)
        YELLOW: 33,  // Client error (4xx)
        CYAN:   36,  // Redirect (3xx)
    },
    GRAY:  '\x1b[90m',
    RESET: '\x1b[0m',
} as const;

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
    json:             (data: Record<string, unknown>) => winston.Logger
}

let orig_console: Record<string, (...args: unknown[]) => void> | null = null;

function LUXON_FORMAT_NOW(): string {
    return DateTime.utc().toISO();
}

function safeStringify(obj: unknown): string {
    try {
        return JSON.stringify(obj);
    } catch{
        return '[Unserializable]';
    }
}

/**
 * Log level constant for messages without timestamp/level prefix.
 * Useful for streaming output like Morgan access logs.
 */
const noprefix = 'noprefix';

const baseLogger: ExtendedLogger = winston.createLogger({
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
                    if(message !== undefined && message !== null && _.isPlainObject(message)) {
                        formattedMessage = safeStringify(message);
                    } else if(message !== undefined && message !== null) {
                        formattedMessage = _.isString(message) ? message : safeStringify(message);
                    } else {
                        formattedMessage = '';
                    }

                    if(level === noprefix) {
                        return _.trim(formattedMessage);
                    }

                    const messageStr = formattedMessage ? ' ' + formattedMessage : '';
                    const metaStr = meta && _.size(meta) ? ' ' + safeStringify(meta) : '';
                    return `[${timestamp ?? ''}] [${_.toUpper(level)}]${messageStr}${metaStr}`;
                })
            ),
        }),
    ],
}) as unknown as ExtendedLogger;

// Wrap logger methods to handle multiple string arguments like console.log
interface LoggerWithMethods {
    info(...args: unknown[]): winston.Logger
    warn(...args: unknown[]): winston.Logger
    error(...args: unknown[]): winston.Logger
    debug(...args: unknown[]): winston.Logger
}

function processLogArgs(args: unknown[]): { message: unknown, metadata?: Record<string, unknown> } {
    // Collect consecutive leading strings
    const stringArgs: string[] = [];
    for(const arg of args) {
        if(!_.isString(arg)) {
            break;
        }
        stringArgs.push(arg);
    }

    // Build message: join strings if we have any, otherwise use first arg
    const hasStrings = stringArgs.length > 0;
    const message = hasStrings ? stringArgs.join(' ') : args[0];

    // Get remaining args (everything after strings, or everything after first arg)
    const remainingArgs = args.slice(hasStrings ? stringArgs.length : 1);

    // Convert all remaining args to metadata objects, then merge
    const metadataObjects = _.map(remainingArgs, (arg: unknown, idx: number): Record<string, unknown> =>
        (_.isPlainObject(arg) ? arg as Record<string, unknown> : { [idx]: arg })
    );
    const metadata = _.assign({}, ...metadataObjects) as Record<string, unknown>;

    return { message, metadata };
}

/**
 * Extended Winston logger with console interception and Express middleware support.
 *
 * @example
 * ```typescript
 * import { logger } from '@hughescr/logger';
 *
 * logger.info('Hello', 'world');           // Multiple args joined
 * logger.info('User logged in', { userId: 123 });  // With metadata
 * logger.error('Failed', new Error('oops'));       // Error logging
 *
 * // Console interception
 * logger.interceptConsole();  // Redirects console.log etc to Winston
 * console.log('Now goes to Winston');
 * logger.restoreConsole();    // Restore original console
 * ```
 *
 * @remarks
 * For PII redaction, consider using @niveus/winston-utils
 */
const logger: ExtendedLogger = _.create(baseLogger) as ExtendedLogger;
_.forEach(['info', 'warn', 'error', 'debug'], (method) => {
    const originalMethod = baseLogger[method as keyof LoggerWithMethods].bind(baseLogger);
    logger[method as keyof LoggerWithMethods] = function(...args: unknown[]): winston.Logger {
        const { message, metadata } = processLogArgs(args);
        return originalMethod(message as string, metadata);
    };
});

/**
 * Log structured JSON data at info level.
 *
 * @param data - Object to log as structured JSON
 * @returns The logger instance for chaining
 *
 * @example
 * ```typescript
 * logger.json({ event: 'user_login', userId: 123, timestamp: Date.now() });
 * ```
 */
logger.json = function(data: Record<string, unknown>): winston.Logger {
    return logger.log({ ...data, level: 'info', message: '' });
};

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
        case (status !== undefined && status >= 500):
            color = ANSI.codes.RED;
            break;
        case (status !== undefined && status >= 400):
            color = ANSI.codes.YELLOW;
            break;
        case (status !== undefined && status >= 300):
            color = ANSI.codes.CYAN;
            break;
        default: color = ANSI.codes.GREEN;
    }

    // Build up format string for Morgan
    interface FormatLineWithCache {
        (tokens: morgan.TokenIndexer<http.IncomingMessage, http.ServerResponse>, req: http.IncomingMessage, res: http.ServerResponse): string
        [key: string]: morgan.FormatFn<http.IncomingMessage, http.ServerResponse> | undefined
    }
    const cachedFormatter = myDevFormatLine as FormatLineWithCache;
    let fn: morgan.FormatFn<http.IncomingMessage, http.ServerResponse> | undefined = cachedFormatter[`colorFormatter${color}`]; // Cache the format lines so we don't have to keep recompiling
    fn ??= cachedFormatter[`colorFormatter${color}`] = morgan.compile(`[:timestamp] ${ANSI.GRAY}:method :url :route \x1b[${color}m:status ${ANSI.GRAY}:response-time[5]ms :referrer ${ANSI.RESET}[:remote-addr] ~:user~`);

    // Stryker disable next-line StringLiteral: Defensive fallback that cannot be triggered in normal operation
    return fn(tokens, req, res) ?? '[FORMAT_ERROR]';
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

        // Stryker disable next-line LogicalOperator: Mutation to || is semantically equivalent since _.isPlainObject(falsy) is always false
        const hasExistingSource = lastArg && _.isPlainObject(lastArg) && (lastArg as LogMetadata).source !== undefined;
        if(!hasExistingSource) {
            argsArray.push({ source: 'console' });
        }

        const lastArgTyped = _.last(argsArray) as LogMetadata;

        if(f == 'error' && !lastArgTyped.stacktrace) {
            const stackTrace = { name: 'Stacktrace' } as { name: string, stack?: string };
            Error.captureStackTrace(stackTrace, hideMe);

            lastArgTyped.stacktrace = stackTrace.stack;
        }

        const methodName = f == 'log' ? 'info' : f as 'info' | 'warn' | 'error';
        return (logger as unknown as LoggerWithMethods)[methodName].apply(logger, argsArray);
    };
});
replacement_console.dir = function(obj: unknown, options?: unknown) {
    logger.info(inspect(obj, options as InspectOptions), { source: 'console' });
};

logger.restoreConsole = function(): void {
    // Stryker disable next-line ConditionalExpression: Guard is defensive; _.assign handles null gracefully but check improves clarity
    if(orig_console) {
        _.assign(console, orig_console);
    }
};

logger.interceptConsole = function(): void {
    if(!orig_console) {
        orig_console = {};
        _.forEach(['log', 'info', 'warn', 'error', 'dir'], (f) => {
            orig_console![f] = (console as unknown as Record<string, (...args: unknown[]) => void>)[f];
        });
    }
    _.assign(console, replacement_console);
};

logger.morganStream = new Writable({
    write(chunk, _encoding, callback) {
        try {
            const message = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            logger.log({ level: noprefix, message });
            return callback();
        } catch (error) {
            return callback(_.isError(error) ? error : new Error(String(error)));
        }
    }
});

/**
 * Express middleware for HTTP request logging using Morgan.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { middleware } from '@hughescr/logger';
 *
 * const app = express();
 * app.use(middleware);
 * ```
 *
 * @remarks
 * Uses custom 'mydev' format with colorized status codes and timestamps.
 */
// Stryker disable next-line ObjectLiteral: By default morgan will hook up to a stream that does the same thing
export const middleware = morgan('mydev', { stream: logger.morganStream });

/**
 * Check if error level logging is enabled.
 * @returns true if error level is enabled
 */
export const isErrorEnabled = (): boolean => logger.isErrorEnabled();

/**
 * Check if warn level logging is enabled.
 * @returns true if warn level is enabled
 */
export const isWarnEnabled = (): boolean => logger.isWarnEnabled();

/**
 * Check if info level logging is enabled.
 * @returns true if info level is enabled
 */
export const isInfoEnabled = (): boolean => logger.isInfoEnabled();

/**
 * Check if debug level logging is enabled.
 * @returns true if debug level is enabled
 */
export const isDebugEnabled = (): boolean => logger.isDebugEnabled();

/**
 * Check if a specific log level is enabled.
 * @param level - The log level to check
 * @returns true if the specified level is enabled
 */
export const isLevelEnabled = (level: string): boolean => logger.isLevelEnabled(level);

export { logger, noprefix };
