import User from '../models/user.model.js';
import logger from '../utils/logger.js';

/**
 * User-based Rate Limiter Middleware
 * 
 * Tracks and enforces daily request limits per user.
 * Resets automatically after 24 hours.
 * 
 * Works in conjunction with IP-based rate limiting for defense in depth.
 */

const DAILY_LIMIT = 50; // Default daily limit
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Check and update user's daily rate limit
 */
export const userRateLimiter = async (req, res, next) => {
    try {
        const userId = req.userId;

        if (!userId) {
            // If no user ID (shouldn't happen with authenticateJWT), fall through
            return next();
        }

        const user = await User.findById(userId);

        if (!user) {
            return next();
        }

        const now = new Date();
        const resetAt = user.usage?.dailyResetAt || now;
        const dailyLimit = user.usage?.dailyLimit || DAILY_LIMIT;

        // Check if 24 hours have passed - reset counter
        if (now - resetAt >= TWENTY_FOUR_HOURS) {
            user.usage = {
                ...user.usage,
                dailyQueries: 1, // This query
                dailyResetAt: now,
                lastQueryAt: now,
                totalQueries: (user.usage?.totalQueries || 0) + 1,
            };
            await user.save();

            // Add rate limit info to response headers
            res.set({
                'X-RateLimit-Limit': dailyLimit,
                'X-RateLimit-Remaining': dailyLimit - 1,
                'X-RateLimit-Reset': new Date(now.getTime() + TWENTY_FOUR_HOURS).toISOString(),
            });

            return next();
        }

        const currentQueries = user.usage?.dailyQueries || 0;

        // Check if limit exceeded
        if (currentQueries >= dailyLimit) {
            const resetTime = new Date(resetAt.getTime() + TWENTY_FOUR_HOURS);
            const waitMinutes = Math.ceil((resetTime - now) / (60 * 1000));

            logger.warn('User rate limit exceeded', {
                userId: user._id,
                email: user.email,
                currentQueries,
                dailyLimit,
                waitMinutes,
            });

            res.set({
                'X-RateLimit-Limit': dailyLimit,
                'X-RateLimit-Remaining': 0,
                'X-RateLimit-Reset': resetTime.toISOString(),
            });

            return res.status(429).json({
                success: false,
                error: {
                    message: `Daily query limit (${dailyLimit}) exceeded. Please try again in ${waitMinutes} minutes.`,
                    code: 'DAILY_LIMIT_EXCEEDED',
                    statusCode: 429,
                    retryAfter: waitMinutes * 60,
                    limit: dailyLimit,
                    remaining: 0,
                    resetAt: resetTime.toISOString(),
                },
            });
        }

        // Update query count
        user.usage = {
            ...user.usage,
            dailyQueries: currentQueries + 1,
            lastQueryAt: now,
            totalQueries: (user.usage?.totalQueries || 0) + 1,
        };
        await user.save();

        // Add rate limit info to response headers
        res.set({
            'X-RateLimit-Limit': dailyLimit,
            'X-RateLimit-Remaining': dailyLimit - currentQueries - 1,
            'X-RateLimit-Reset': new Date(resetAt.getTime() + TWENTY_FOUR_HOURS).toISOString(),
        });

        // Attach remaining count to request for potential frontend use
        req.rateLimitInfo = {
            limit: dailyLimit,
            remaining: dailyLimit - currentQueries - 1,
            used: currentQueries + 1,
        };

        next();
    } catch (error) {
        logger.error('User rate limiter error', { error: error.message });
        // Don't block request on rate limiter errors
        next();
    }
};

/**
 * Get current rate limit status for a user
 */
export const getRateLimitStatus = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const now = new Date();
        const resetAt = user.usage?.dailyResetAt || now;
        const dailyLimit = user.usage?.dailyLimit || DAILY_LIMIT;

        // Check if reset needed
        if (now - resetAt >= TWENTY_FOUR_HOURS) {
            return {
                limit: dailyLimit,
                used: 0,
                remaining: dailyLimit,
                resetAt: new Date(now.getTime() + TWENTY_FOUR_HOURS),
            };
        }

        const currentQueries = user.usage?.dailyQueries || 0;

        return {
            limit: dailyLimit,
            used: currentQueries,
            remaining: Math.max(0, dailyLimit - currentQueries),
            resetAt: new Date(resetAt.getTime() + TWENTY_FOUR_HOURS),
        };
    } catch (error) {
        logger.error('Error getting rate limit status', { error: error.message });
        return null;
    }
};

export default { userRateLimiter, getRateLimitStatus };
