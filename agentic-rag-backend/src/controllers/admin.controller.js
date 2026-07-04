import cacheService from '../services/cache.service.js';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Log from '../models/log.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';
import Report from '../models/report.model.js';

/**
 * Admin Controller
 * 
 * Handles admin-only endpoints (Future implementation):
 * - Clear cache
 * - Get analytics
 * - Manage users
 * - Export logs
 * - View all conversations
 * 
 * Note: All endpoints currently return "Coming soon"
 * Will be activated when implementing:
 * 1. Google OAuth authentication
 * 2. Admin role management
 * 3. Admin dashboard frontend
 */
class AdminController {
    /**
     * Clear entire cache (Admin only)
     * 
     * POST /api/admin/cache/clear
     * Requires admin authentication
     */
    clearCache = asyncHandler(async (req, res) => {
        // TODO: Implement when admin auth is ready
        // Verify admin role
        // const success = await cacheService.clear();
        //
        // if (!success) {
        //   throw new Error('Failed to clear cache');
        // }
        //
        // logger.info('Cache cleared by admin', {
        //   adminId: req.user.id,
        //   adminEmail: req.user.email,
        // });
        //
        // res.json(successResponse(
        //   { cleared: true },
        //   'Cache cleared successfully'
        // ));

        res.json({
            success: false,
            message: 'Admin cache management coming soon (requires admin authentication)',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });

    /**
     * Get analytics data (Admin only)
     * 
     * GET /api/admin/analytics?startDate=...&endDate=...&period=daily
     * Requires admin authentication
     */
    getAnalytics = asyncHandler(async (req, res) => {
        // TODO: Implement when analytics model is active
        // const { startDate, endDate, period = 'daily' } = req.query;
        //
        // const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        // const end = endDate ? new Date(endDate) : new Date();
        //
        // const analytics = await Analytics.getAnalytics(start, end, period);
        // const summary = await Analytics.getSummary(7);
        //
        // res.json(analyticsResponse(
        //   {
        //     records: analytics,
        //     summary,
        //   },
        //   period,
        //   start,
        //   end
        // ));

        res.json({
            success: false,
            message: 'Analytics dashboard coming soon (requires admin authentication)',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });

    /**
     * Get all conversations with stats (Admin only)
     * 
     * GET /api/admin/conversations?page=1&limit=20
     * Requires admin authentication
     */
    getConversations = asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Aggregate conversations with user info and message stats
        const conversations = await Conversation.aggregate([
            // Join with users collection
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            // Join with messages collection
            {
                $lookup: {
                    from: 'messages',
                    localField: '_id',
                    foreignField: 'conversationId',
                    as: 'messages'
                }
            },
            // Add computed fields
            {
                $addFields: {
                    totalMessages: { $size: '$messages' },
                    likedCount: {
                        $size: {
                            $filter: {
                                input: '$messages',
                                cond: { $eq: ['$$this.feedback', 'liked'] }
                            }
                        }
                    },
                    dislikedCount: {
                        $size: {
                            $filter: {
                                input: '$messages',
                                cond: { $eq: ['$$this.feedback', 'disliked'] }
                            }
                        }
                    },
                    userName: '$user.profile.name',
                    userEmail: '$user.email'
                }
            },
            // Remove messages array and sensitive user data
            { $project: { messages: 0, 'user.googleId': 0, 'user.password': 0 } },
            // Sort by newest first
            { $sort: { createdAt: -1 } },
            // Paginate
            { $skip: skip },
            { $limit: parseInt(limit) }
        ]);

        // Get total count for pagination
        const totalCount = await Conversation.countDocuments();

        logger.info('Conversations retrieved by admin', {
            adminId: req.user._id,
            count: conversations.length,
            page,
        });

        res.json({
            success: true,
            data: conversations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit)
            }
        });
    });

    /**
     * Get user statistics (Admin only)
     * 
     * GET /api/admin/users/stats
     * Requires admin authentication
     */
    getUserStats = asyncHandler(async (req, res) => {
        // Get basic user counts
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const adminUsers = await User.countDocuments({ role: 'admin' });

        // Get users with most queries (top 10)
        const topUsers = await User.find({ 'usage.totalQueries': { $gt: 0 } })
            .sort({ 'usage.totalQueries': -1 })
            .limit(10)
            .select('email profile.name usage.totalQueries usage.lastQueryAt createdAt')
            .lean();

        // Get recent activity (users active in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentActiveUsers = await User.countDocuments({
            'usage.lastQueryAt': { $gte: sevenDaysAgo }
        });

        // Get total queries across all users
        const queryStats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalQueries: { $sum: '$usage.totalQueries' },
                    totalDailyQueries: { $sum: '$usage.dailyQueries' }
                }
            }
        ]);

        logger.info('User stats retrieved by admin', {
            adminId: req.user._id,
            totalUsers,
        });

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    activeUsers,
                    adminUsers,
                    recentActiveUsers,
                    totalQueries: queryStats[0]?.totalQueries || 0,
                    todayQueries: queryStats[0]?.totalDailyQueries || 0,
                },
                topUsers: topUsers.map(u => ({
                    email: u.email,
                    name: u.profile?.name || 'Unknown',
                    totalQueries: u.usage?.totalQueries || 0,
                    lastActive: u.usage?.lastQueryAt,
                    joinedAt: u.createdAt,
                })),
            }
        });
    });

    /**
     * Export logs (Admin only)
     * 
     * GET /api/admin/logs/export?type=combined&days=7
     * Requires admin authentication
     */
    exportLogs = asyncHandler(async (req, res) => {
        // TODO: Implement log export
        // const { type = 'combined', days = 7 } = req.query;
        //
        // const logFile = path.join(__dirname, `../../logs/${type}.log`);
        //
        // if (!fs.existsSync(logFile)) {
        //   throw new NotFoundError('Log file');
        // }
        //
        // res.download(logFile, `${type}-logs-${Date.now()}.log`);

        res.json({
            success: false,
            message: 'Log export coming soon (requires admin authentication)',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });

    /**
     * Get logs with filters (Admin only)
     * 
     * GET /api/admin/logs?feedbackType=all&timeRange=24h&page=1&limit=20
     * Requires admin authentication
     */
    getLogs = asyncHandler(async (req, res) => {
        const { feedbackType, timeRange, startDate, endDate, page, limit } = req.query;

        const result = await Log.getFilteredLogs({
            feedbackType,
            timeRange,
            startDate,
            endDate,
            page,
            limit,
        });

        logger.info('Logs retrieved by admin', {
            adminId: req.user._id,
            filters: result.filters_applied,
            total: result.total,
        });

        res.json({
            success: true,
            ...result,
        });
    });

    /**
     * Manually trigger analytics update (Admin only)
     * 
     * POST /api/admin/analytics/update
     * Requires admin authentication
     */
    updateAnalytics = asyncHandler(async (req, res) => {
        // TODO: Implement manual analytics update
        // const today = new Date();
        // today.setHours(0, 0, 0, 0);
        //
        // await Analytics.updatePerformanceMetrics(today);
        //
        // res.json(successResponse(
        //   { updated: true },
        //   'Analytics updated successfully'
        // ));

        res.json({
            success: false,
            message: 'Manual analytics update coming soon (requires admin authentication)',
            code: 'FEATURE_NOT_IMPLEMENTED',
        });
    });

    /**
     * Get rate limit settings (Admin only)
     * 
     * GET /api/admin/rate-limit
     * Requires admin authentication
     */
    getRateLimit = asyncHandler(async (req, res) => {
        const settings = await Settings.getSettings();
        res.json(successResponse(settings.rateLimit, 'Rate limit settings retrieved successfully'));
    });

    /**
     * Update rate limit settings (Admin only)
     * 
     * POST /api/admin/rate-limit
     * Requires admin authentication
     */
    updateRateLimit = asyncHandler(async (req, res) => {
        const { enabled, type, requestLimit, tokenLimit } = req.body;

        // Validation
        if (enabled !== undefined && typeof enabled !== 'boolean') {
            return res.status(400).json(errorResponse('enabled must be a boolean', 'VALIDATION_ERROR'));
        }

        if (type !== undefined && !['requests', 'tokens'].includes(type)) {
            return res.status(400).json(errorResponse('type must be either "requests" or "tokens"', 'VALIDATION_ERROR'));
        }

        if (requestLimit !== undefined) {
            const limit = parseInt(requestLimit);
            if (isNaN(limit) || limit < 1 || limit > 10000) {
                return res.status(400).json(errorResponse('requestLimit must be between 1 and 10,000', 'VALIDATION_ERROR'));
            }
        }

        if (tokenLimit !== undefined) {
            const limit = parseInt(tokenLimit);
            if (isNaN(limit) || limit < 100 || limit > 1000000) {
                return res.status(400).json(errorResponse('tokenLimit must be between 100 and 1,000,000', 'VALIDATION_ERROR'));
            }
        }

        const settings = await Settings.getSettings();

        if (enabled !== undefined) settings.rateLimit.enabled = enabled;
        if (type !== undefined) settings.rateLimit.type = type;
        if (requestLimit !== undefined) settings.rateLimit.requestLimit = parseInt(requestLimit);
        if (tokenLimit !== undefined) settings.rateLimit.tokenLimit = parseInt(tokenLimit);

        await settings.save();

        res.json(successResponse(settings.rateLimit, 'Rate limit settings updated successfully'));
    });
    /**
     * Get all reports (Admin only)
     * 
     * GET /api/admin/reports?page=1&limit=20
     * Requires admin authentication
     */
    getReports = asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reports = await Report.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await Report.countDocuments();

        logger.info('Reports retrieved by admin', {
            adminId: req.user._id,
            count: reports.length,
            page,
        });

        res.json({
            success: true,
            data: reports,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit)
            }
        });
    });
}

export default new AdminController();
