import express from 'express';
import adminController from '../controllers/admin.controller.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { requireAdmin, authenticateJWT } from '../middleware/auth.middleware.js';
import {
    validateDateRange,
    validatePagination,
    handleValidationErrors,
} from '../middleware/validator.js';

const router = express.Router();

// Apply authenticateJWT and requireAdmin to all routes in this router
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * Admin Routes (Future implementation)
 * 
 * All routes require admin authentication
 * Currently return "Coming soon" messages
 * 
 * POST /api/admin/cache/clear - Clear cache
 * GET /api/admin/analytics - Get analytics
 * GET /api/admin/conversations - Get all conversations
 * GET /api/admin/users/stats - Get user statistics
 * GET /api/admin/logs/export - Export logs
 * POST /api/admin/analytics/update - Manually update analytics
 */

/**
 * @route   POST /api/admin/cache/clear
 * @desc    Clear entire cache
 * @access  Private (Admin only)
 */
router.post(
    '/cache/clear',
    requireAdmin, // Will verify admin role when auth is implemented
    adminLimiter,
    adminController.clearCache
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access  Private (Admin only)
 */
router.get(
    '/analytics',
    adminLimiter,
    validateDateRange,
    handleValidationErrors,
    adminController.getAnalytics
);

/**
 * @route   GET /api/admin/conversations
 * @desc    Get all conversations
 * @access  Private (Admin only)
 */
router.get(
    '/conversations',
    adminLimiter,
    validatePagination,
    handleValidationErrors,
    adminController.getConversations
);

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get(
    '/users/stats',
    adminLimiter,
    adminController.getUserStats
);

/**
 * @route   GET /api/admin/logs
 * @desc    Get logs with filters
 * @access  Private (Admin only)
 */
router.get(
    '/logs',
    adminLimiter,
    validatePagination,
    handleValidationErrors,
    adminController.getLogs
);

/**
 * @route   GET /api/admin/logs/export
 * @desc    Export logs
 * @access  Private (Admin only)
 */
router.get(
    '/logs/export',
    adminLimiter,
    adminController.exportLogs
);

/**
 * @route   POST /api/admin/analytics/update
 * @desc    Manually trigger analytics update
 * @access  Private (Admin only)
 */
router.post(
    '/analytics/update',
    adminLimiter,
    adminController.updateAnalytics
);

/**
 * @route   GET /api/admin/rate-limit
 * @desc    Get rate limit settings
 * @access  Private (Admin only)
 */
router.get(
    '/rate-limit',
    adminLimiter,
    adminController.getRateLimit
);

/**
 * @route   POST /api/admin/rate-limit
 * @desc    Update rate limit settings
 * @access  Private (Admin only)
 */
router.post(
    '/rate-limit',
    adminLimiter,
    adminController.updateRateLimit
);

/**
 * @route   GET /api/admin/reports
 * @desc    Get all reports
 * @access  Private (Admin only)
 */
router.get(
    '/reports',
    adminLimiter,
    adminController.getReports
);

export default router;
