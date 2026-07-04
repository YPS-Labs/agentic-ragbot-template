import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { authLimiter, guestLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Authentication Routes
 * 
 * POST /api/auth/google - Google OAuth login
 * POST /api/auth/guest - Guest login
 * GET /api/auth/me - Get current user
 * POST /api/auth/logout - Logout
 */

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate with Google OAuth
 * @access  Public
 */
router.post('/google', authLimiter, authController.googleLogin);

/**
 * @route   POST /api/auth/guest
 * @desc    Login as guest user
 * @access  Public
 */
router.post('/guest', guestLimiter, authController.guestLogin);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticateJWT, authController.getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current user
 * @access  Private
 */
router.post('/logout', authenticateJWT, authController.logout);

export default router;
