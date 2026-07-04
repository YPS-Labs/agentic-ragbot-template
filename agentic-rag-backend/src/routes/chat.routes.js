import express from 'express';
import chatController from '../controllers/chat.controller.js';
import { strictLimiter } from '../middleware/rateLimiter.js';
import { userRateLimiter } from '../middleware/userRateLimiter.js';
import {
    validateChatRequest,
    validateFeedback,
    validatePagination,
    handleValidationErrors,
    sanitizeInput,
} from '../middleware/validator.js';
import { optionalAuth, authenticateJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Chat Routes
 * 
 * POST /api/chat - Process chat query
 * GET /api/chat/history - Get chat history (future)
 * POST /api/chat/save - Save conversation (future)
 * POST /api/chat/feedback - Submit feedback (future)
 */

/**
 * @route   POST /api/chat
 * @desc    Process chat query
 * @access  Private
 */
router.post(
    '/chat',
    authenticateJWT,
    // Use user-based limiter; strict IP limiter would double-limit the same action
    userRateLimiter,
    sanitizeInput,
    validateChatRequest,
    handleValidationErrors,
    chatController.processChat
);

/**
 * @route   GET /api/chat/history
 * @desc    Get user's chat history
 * @access  Private (future - requires authentication)
 */
router.get(
    '/chat/history',
    optionalAuth, // Will be authenticateJWT when auth is implemented
    validatePagination,
    handleValidationErrors,
    chatController.getChatHistory
);

/**
 * @route   POST /api/chat/save
 * @desc    Save a conversation
 * @access  Private (future - requires authentication)
 */
router.post(
    '/chat/save',
    optionalAuth, // Will be authenticateJWT when auth is implemented
    chatController.saveConversation
);

/**
 * @route   POST /api/chat/feedback
 * @desc    Submit feedback for a conversation
 * @access  Public
 */
router.post(
    '/chat/feedback',
    sanitizeInput,
    validateFeedback,
    handleValidationErrors,
    chatController.submitFeedback
);

export default router;
