import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes/index.js';
import { correlationId, requestLogger } from './middleware/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validator.js';
import env from './config/environment.js';
import logger from './utils/logger.js';

/**
 * Express Application Configuration
 * Sets up Express app with:
 * - Security middleware (helmet)
 * - CORS configuration
 * - Request parsing
 * - Logging
 * - Routes
 * - Error handling
 */

const app = express();

/**
 * Security Middleware
 */
app.use(
    helmet({
        contentSecurityPolicy: env.isProduction,
        crossOriginEmbedderPolicy: env.isProduction,
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
);

/**
 * CORS Configuration
 */
app.use(
    cors({
        origin: env.frontendUrl2 || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID'],
    })
);

/**
 * Request Parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request ID and Logging
 */
app.use(correlationId);
app.use(requestLogger);

/**
 * Input Sanitization
 */
app.use(sanitizeInput);

/**
 * Trust proxy (for deployment behind reverse proxy)
 */
if (env.isProduction) {
    app.set('trust proxy', 1);
}

/**
 * Routes
 */
app.use('/', routes);

/**
 * Error Handling (must be last)
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Graceful shutdown handler
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason,
        promise,
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
    });

    // Exit process after logging
    process.exit(1);
});

export default app;
