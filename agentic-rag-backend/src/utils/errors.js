/**
 * Custom error classes for the application
 * Provides structured error handling with proper HTTP status codes
 */

/**
 * Base application error class
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

/**
 * Authentication error (401) - For future OAuth implementation
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required', details = null) {
        super(message, 401, 'AUTHENTICATION_ERROR', details);
    }
}

/**
 * Authorization error (403) - For future admin/role checks
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions', details = null) {
        super(message, 403, 'AUTHORIZATION_ERROR', details);
    }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource', details = null) {
        super(`${resource} not found`, 404, 'NOT_FOUND', details);
    }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests, please try again later', details = null) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
    }
}

/**
 * Python execution error (500)
 */
export class PythonExecutionError extends AppError {
    constructor(message, details = null) {
        super(message, 500, 'PYTHON_EXECUTION_ERROR', details);
    }
}

/**
 * Queue timeout error (504)
 */
export class QueueTimeoutError extends AppError {
    constructor(message = 'Request processing timeout', details = null) {
        super(message, 504, 'QUEUE_TIMEOUT', details);
    }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
    constructor(message, details = null) {
        super(message, 500, 'DATABASE_ERROR', details);
    }
}

/**
 * Cache error (500)
 */
export class CacheError extends AppError {
    constructor(message, details = null) {
        super(message, 500, 'CACHE_ERROR', details);
    }
}

/**
 * External API error (502)
 */
export class ExternalAPIError extends AppError {
    constructor(service, message, details = null) {
        super(`${service} API error: ${message}`, 502, 'EXTERNAL_API_ERROR', details);
    }
}

/**
 * Configuration error (500)
 */
export class ConfigurationError extends AppError {
    constructor(message, details = null) {
        super(message, 500, 'CONFIGURATION_ERROR', details);
    }
}
