import { body, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

/**
 * Request Validation Middleware
 * 
 * Validates incoming requests using express-validator
 */

/**
 * Validate chat request
 */
export const validateChatRequest = [
    body('query')
        .exists().withMessage('Query is required')
        .isString().withMessage('Query must be a string')
        .trim()
        .isLength({ min: 1, max: 2000 }).withMessage('Query must be between 1 and 2000 characters')
        .notEmpty().withMessage('Query cannot be empty'),

    body('userId')
        .optional()
        .isString().withMessage('User ID must be a string')
        .trim()
        .isLength({ max: 100 }).withMessage('User ID too long'),

    body('sessionId')
        .optional()
        .isString().withMessage('Session ID must be a string')
        .trim()
        .isLength({ max: 100 }).withMessage('Session ID too long'),
];

/**
 * Validate date range query (for future analytics)
 */
export const validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),

    query('endDate')
        .optional()
        .isISO8601().withMessage('End date must be a valid ISO 8601 date'),
];

/**
 * Validate pagination query (for future chat history)
 */
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),
];

/**
 * Validate user ID parameter (for future user-specific endpoints)
 */
export const validateUserId = [
    query('userId')
        .exists().withMessage('User ID is required')
        .isString().withMessage('User ID must be a string')
        .trim()
        .notEmpty().withMessage('User ID cannot be empty'),
];

/**
 * Validate feedback request (for future feedback feature)
 */
export const validateFeedback = [
    body('conversationId')
        .exists().withMessage('Conversation ID is required')
        .isMongoId().withMessage('Invalid conversation ID'),

    body('rating')
        .exists().withMessage('Rating is required')
        .isIn(['positive', 'negative']).withMessage('Rating must be positive or negative'),

    body('comment')
        .optional()
        .isString().withMessage('Comment must be a string')
        .trim()
        .isLength({ max: 500 }).withMessage('Comment too long (max 500 characters)'),
];

/**
 * Handle validation errors
 * 
 * Middleware to check validation results and return errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: err.msg,
            value: err.value,
        }));

        return res.status(400).json({
            success: false,
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                details: formattedErrors,
            },
        });
    }

    next();
};

/**
 * Sanitize input (additional security layer)
 */
export const sanitizeInput = (req, res, next) => {
    // Remove any potential XSS attempts from string fields
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove HTML tags and script content
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<[^>]+>/g, '')
                    .trim();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };

    if (req.body) {
        sanitize(req.body);
    }

    if (req.query) {
        sanitize(req.query);
    }

    next();
};
