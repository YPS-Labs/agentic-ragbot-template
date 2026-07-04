import logger, { logError } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import env from '../config/environment.js';

/**
 * Error Handling Middleware
 * 
 * Global error handler for the application
 */

/**
 * Handle 404 - Not Found
 */
export const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.path} not found`,
            code: 'NOT_FOUND',
            statusCode: 404,
        },
    });
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
    // Log error
    logError(err, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.body?.userId || req.user?.id,
        requestId: req.id,
    });

    // Default error values
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details = null;

    // Handle operational errors (AppError and subclasses)
    if (err instanceof AppError && err.isOperational) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    }
    // Handle Mongoose validation errors
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
        details = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
        }));
    }
    // Handle Mongoose cast errors
    else if (err.name === 'CastError') {
        statusCode = 400;
        code = 'INVALID_ID';
        message = `Invalid ${err.path}: ${err.value}`;
    }
    // Handle duplicate key errors
    else if (err.code === 11000) {
        statusCode = 409;
        code = 'DUPLICATE_ERROR';
        message = 'Duplicate field value entered';
        details = { field: Object.keys(err.keyPattern)[0] };
    }
    // Handle JWT errors (for future auth)
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Authentication token expired';
    }

    // Build error response
    const errorResponse = {
        success: false,
        error: {
            message,
            code,
            statusCode,
        },
    };

    // Add details if present
    if (details) {
        errorResponse.error.details = details;
    }

    // Add stack trace in development
    if (env.isDevelopment && err.stack) {
        errorResponse.error.stack = err.stack;
    }

    // Add request ID for tracking
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
