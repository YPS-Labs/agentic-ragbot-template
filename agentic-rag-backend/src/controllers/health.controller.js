import { getDBHealth } from '../config/database.js';
import { getRedisHealth } from '../config/redis.js';
import pythonBridge from '../services/python/bridge.js';
import queueService from '../services/queue.service.js';
import cacheService from '../services/cache.service.js';
import logger from '../utils/logger.js';
import { healthResponse, queueStatsResponse, successResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Health Controller
 * 
 * Handles health check and monitoring endpoints:
 * - System health status
 * - Queue statistics
 * - System metrics
 * - Cache statistics
 */
class HealthController {
    /**
     * Get system health status
     * 
     * GET /health
     */
    getHealth = asyncHandler(async (req, res) => {
        const startTime = Date.now();

        // Check all services in parallel
        const [dbHealth, redisHealth, queueStats] = await Promise.all([
            getDBHealth(),
            getRedisHealth(),
            queueService.getQueueStats(),
        ]);

        // Check Python health (optional, can be slow)
        let pythonHealth = { status: 'unknown' };
        try {
            const isPythonHealthy = await Promise.race([
                pythonBridge.healthCheck(),
                new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
            ]);
            pythonHealth = {
                status: isPythonHealthy ? 'healthy' : 'unhealthy',
            };
        } catch (error) {
            pythonHealth = {
                status: 'error',
                error: error.message,
            };
        }

        // Determine overall health
        const isHealthy =
            dbHealth.status === 'connected' &&
            redisHealth.status === 'ready' &&
            queueStats.health === 'healthy';

        const isDegraded =
            !isHealthy &&
            (dbHealth.status === 'connected' ||
                redisHealth.status === 'ready' ||
                queueStats.health === 'degraded');

        const overallStatus = isHealthy
            ? 'healthy'
            : isDegraded
                ? 'degraded'
                : 'unhealthy';

        const statusCode = isHealthy ? 200 : isDegraded ? 200 : 503;

        const elapsed = Date.now() - startTime;

        res.status(statusCode).json(
            healthResponse(
                overallStatus,
                {
                    mongodb: dbHealth,
                    redis: redisHealth,
                    python: pythonHealth,
                    queue: {
                        waiting: queueStats.waiting,
                        active: queueStats.active,
                        failed: queueStats.failed,
                        health: queueStats.health,
                    },
                    healthCheckElapsed: `${elapsed}ms`,
                },
                process.uptime()
            )
        );
    });

    /**
     * Get queue statistics
     * 
     * GET /api/queue/status
     */
    getQueueStats = asyncHandler(async (req, res) => {
        const stats = await queueService.getQueueStats();

        res.json(queueStatsResponse(stats));
    });

    /**
     * Get system statistics
     * 
     * GET /api/stats
     */
    getSystemStats = asyncHandler(async (req, res) => {
        const [queueStats, cacheStats, pythonStats] = await Promise.all([
            queueService.getQueueStats(),
            Promise.resolve(cacheService.getStats()),
            Promise.resolve(pythonBridge.getStats()),
        ]);

        const memoryUsage = process.memoryUsage();

        const stats = {
            system: {
                uptime: `${Math.floor(process.uptime())}s`,
                memory: {
                    used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                    total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                    external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
                },
                nodeVersion: process.version,
                platform: process.platform,
            },
            queue: queueStats,
            cache: cacheStats,
            python: pythonStats,
        };

        res.json(successResponse(stats, 'System statistics retrieved'));
    });

    /**
     * Get cache statistics
     * 
     * GET /api/cache/stats
     */
    getCacheStats = asyncHandler(async (req, res) => {
        const stats = cacheService.getStats();
        const size = await cacheService.getSize();

        res.json(
            successResponse(
                {
                    ...stats,
                    size,
                },
                'Cache statistics retrieved'
            )
        );
    });
}

export default new HealthController();
