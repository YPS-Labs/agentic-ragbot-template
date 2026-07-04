import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import env from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format
 */
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }

    // Add stack trace for errors
    if (stack) {
        msg += `\n${stack}`;
    }

    return msg;
});

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
    level: env.logLevel,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console transport (colorized in development)
        new winston.transports.Console({
            format: env.isDevelopment
                ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat)
                : combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        }),

        // File transport for all logs
        new winston.transports.File({
            filename: join(__dirname, '../../logs/combined.log'),
            maxsize: env.logFileMaxSize,
            maxFiles: env.logFileMaxFiles,
        }),

        // Separate file for errors
        new winston.transports.File({
            filename: join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: env.logFileMaxSize,
            maxFiles: env.logFileMaxFiles,
        }),
    ],
    // Don't exit on handled exceptions
    exitOnError: false,
});

/**
 * Log unhandled exceptions and rejections
 */
logger.exceptions.handle(
    new winston.transports.File({
        filename: join(__dirname, '../../logs/exceptions.log'),
    })
);

logger.rejections.handle(
    new winston.transports.File({
        filename: join(__dirname, '../../logs/rejections.log'),
    })
);

/**
 * Helper methods for structured logging
 */
export const logRequest = (req, message = 'Incoming request') => {
    logger.info(message, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id,
    });
};

export const logResponse = (req, res, elapsed) => {
    logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        elapsed: `${elapsed}ms`,
        requestId: req.id,
    });
};

export const logError = (error, context = {}) => {
    logger.error(error.message, {
        ...context,
        stack: error.stack,
        name: error.name,
    });
};

export const logPythonExecution = (query, elapsed, success, error = null) => {
    const logData = {
        queryLength: query.length,
        elapsed: `${elapsed}ms`,
        success,
    };

    if (error) {
        logger.error('Python execution failed', { ...logData, error: error.message });
    } else {
        logger.info('Python execution completed', logData);
    }
};

export const logCacheOperation = (operation, key, hit = null) => {
    logger.debug(`Cache ${operation}`, {
        key: key.substring(0, 16) + '...',
        hit: hit !== null ? hit : undefined,
    });
};

export const logQueueJob = (jobId, status, data = {}) => {
    logger.info(`Queue job ${status}`, {
        jobId,
        ...data,
    });
};

// Export default logger
export default logger;
