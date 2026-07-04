import express from 'express';
import healthController from '../controllers/health.controller.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Health Check Routes
 * 
 * GET /health - System health status
 * GET /api/queue/status - Queue statistics
 * GET /api/stats - System statistics
 * GET /api/cache/stats - Cache statistics
 */

/**
 * @route   GET /health
 * @desc    Get system health status
 * @access  Public
 */
router.get('/health', healthController.getHealth);

/**
 * @route   GET /api/queue/status
 * @desc    Get queue statistics
 * @access  Public
 */
router.get('/queue/status', generalLimiter, healthController.getQueueStats);

/**
 * @route   GET /api/stats
 * @desc    Get system statistics
 * @access  Public
 */
router.get('/stats', generalLimiter, healthController.getSystemStats);

/**
 * @route   GET /api/cache/stats
 * @desc    Get cache statistics
 * @access  Public
 */
router.get('/cache/stats', generalLimiter, healthController.getCacheStats);

export default router;
