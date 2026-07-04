import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import User from '../models/user.model.js';
import env from '../config/environment.js';

/**
 * Authentication Middleware
 * 
 * Handles:
 * - JWT token verification
 * - User authentication
 * - Admin role checking
 */

/**
 * Authenticate JWT token
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const authenticateJWT = async (req, res, next) => {
    try {
        const token = req.get('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new AuthenticationError('No authentication token provided');
        }

        // Verify JWT token
        const decoded = jwt.verify(token, env.jwtSecret);

        // Fetch user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new AuthenticationError('User not found');
        }

        if (user.status !== 'active') {
            throw new AuthenticationError('User account is not active');
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;

        logger.debug('User authenticated', { userId: user._id, email: user.email });

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new AuthenticationError('Invalid token'));
        } else if (error.name === 'TokenExpiredError') {
            next(new AuthenticationError('Token expired'));
        } else {
            next(error);
        }
    }
};

/**
 * Require admin role
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }

        if (!req.user.isAdmin()) {
            logger.warn('Admin access denied', { userId: req.user._id, email: req.user.email });
            throw new AuthorizationError('Admin access required');
        }

        logger.debug('Admin access granted', { userId: req.user._id });
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional authentication (doesn't fail if no token)
 * Useful for endpoints that work with or without auth
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.get('Authorization')?.replace('Bearer ', '');

        if (token) {
            try {
                const decoded = jwt.verify(token, env.jwtSecret);
                const user = await User.findById(decoded.userId);

                if (user && user.status === 'active') {
                    req.user = user;
                    req.userId = user._id;
                }
            } catch (error) {
                // Invalid token, but don't fail - just continue without user
                logger.debug('Invalid token in optional auth', { error: error.message });
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};
