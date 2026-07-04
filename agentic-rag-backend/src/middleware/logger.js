import { v4 as uuidv4 } from 'uuid';
import logger, { logRequest, logResponse } from '../utils/logger.js';

/**
 * Logging Middleware
 * 
 * Request/response logging and correlation ID generation
 */

/**
 * Generate correlation ID for request tracking
 */
export const correlationId = (req, res, next) => {
    // Use existing request ID from header or generate new one
    req.id = req.get('X-Request-ID') || uuidv4();

    // Add to response header
    res.setHeader('X-Request-ID', req.id);

    next();
};

/**
 * Request logger middleware
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log incoming request
    logRequest(req, 'Incoming request');

    // Capture response
    const originalSend = res.send;

    res.send = function (data) {
        const elapsed = Date.now() - startTime;

        // Log response
        logResponse(req, res, elapsed);

        // Call original send
        originalSend.call(this, data);
    };

    next();
};

/**
 * Error request logger (logs failed requests)
 */
export const errorRequestLogger = (err, req, res, next) => {
    logger.error('Request failed', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        error: err.message,
        requestId: req.id,
    });

    next(err);
};
