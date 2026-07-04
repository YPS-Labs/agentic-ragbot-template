import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { RateLimitError } from '../utils/errors.js';
import env from '../config/environment.js';

/**
 * Rate Limiting Middleware
 * 
 * Protects endpoints from abuse with different limits:
 * - General limiter for most endpoints
 * - Strict limiter for expensive operations (chat processing)
 * - Admin limiter for admin endpoints
 * - Auth limiter for authentication endpoints
 */

/**
 * Helper to get a stable client identifier
 * - Uses req.ip as provided by Express (respects trust proxy)
 * - Optionally combines with User-Agent to better distinguish clients
 */
const getClientKey = (req, { includeUserAgent = false } = {}) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (!includeUserAgent) return ip;

    const ua = req.get('User-Agent') || 'unknown-ua';
    return `${ip}|${ua}`;
};

/**
 * Auth rate limiter (5 requests per 10 minutes)
 */
export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    // For unauthenticated endpoints (google/guest), use IP+UA to reduce abuse
    keyGenerator: (req) => getClientKey(req, { includeUserAgent: true }),
    handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
            key: getClientKey(req, { includeUserAgent: true }),
            path: req.path,
        });

        res.status(429).json({
            success: false,
            error: {
                message: 'Too many authentication attempts, please wait 10 minutes before trying again',
                code: 'AUTH_RATE_LIMIT_EXCEEDED',
                statusCode: 429,
                retryAfter: 600,
            },
        });
    },
});

/**
 * Guest-only rate limiter (stricter: 3 guest logins per 10 minutes per device)
 */
export const guestLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    message: 'Too many guest login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientKey(req, { includeUserAgent: true }),
    handler: (req, res) => {
        const key = getClientKey(req, { includeUserAgent: true });

        logger.warn('Guest rate limit exceeded', {
            key,
            path: req.path,
        });

        res.status(429).json({
            success: false,
            error: {
                message: 'Too many guest login attempts, please wait 10 minutes before trying again',
                code: 'GUEST_RATE_LIMIT_EXCEEDED',
                statusCode: 429,
                retryAfter: 600,
            },
        });
    },
});

/**
 * General rate limiter (50 requests per 15 minutes)
 */
export const generalLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientKey(req),
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            key: getClientKey(req),
            path: req.path,
        });

        res.status(429).json({
            success: false,
            error: {
                message: 'Too many requests, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
                statusCode: 429,
                retryAfter: Math.ceil(env.rateLimitWindowMs / 1000),
            },
        });
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    },
});

/**
 * Strict rate limiter for expensive endpoints (10 requests per 5 minutes)
 */
export const strictLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many chat requests, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientKey(req),
    handler: (req, res) => {
        logger.warn('Strict rate limit exceeded', {
            key: getClientKey(req),
            path: req.path,
            userId: req.body?.userId,
        });

        res.status(429).json({
            success: false,
            error: {
                message: 'Too many chat requests, please wait before trying again',
                code: 'RATE_LIMIT_EXCEEDED',
                statusCode: 429,
                retryAfter: 300, // 5 minutes
            },
        });
    },
});

/**
 * Admin rate limiter (100 requests per 10 minutes) - For future admin endpoints
 */
export const adminLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100,
    message: 'Too many admin requests',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Prefer authenticated user ID for admin requests, fall back to IP
        return req.user?._id?.toString() || getClientKey(req);
    },
    handler: (req, res) => {
        logger.warn('Admin rate limit exceeded', {
            key: getClientKey(req),
            userId: req.user?.id,
            path: req.path,
        });

        res.status(429).json({
            success: false,
            error: {
                message: 'Too many admin requests',
                code: 'RATE_LIMIT_EXCEEDED',
                statusCode: 429,
            },
        });
    },
});

/**
 * Custom rate limiter factory for flexible limits
 * 
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limit middleware
 */
export const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 50,
        message: options.message || 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => getClientKey(req),
        ...options,
    });
};
